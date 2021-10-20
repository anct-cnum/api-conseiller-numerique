const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated, BadRequest, GeneralError } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const statsCras = require('./cras');
const Joi = require('joi');
const dayjs = require('dayjs');
const logger = require('../../logger');
//const statsPdf = require('./stats.pdf');
const puppeteer = require('puppeteer');

exports.Stats = class Stats extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('stats');
    });

    app.get('/stats/conseillers/finalisees', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!['structure'].includes(user?.roles[0])) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }
        const conseillers = await db.collection('misesEnRelation').countDocuments({ statut: 'finalisee' });
        res.send({ conseillerTotalFinalisee: conseillers });
      });
    });

    app.get('/stats/dashboard', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //verify user role admin
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: adminUser
          }).toJSON());
          return;
        }

        let stats = {};
        stats.structuresCount = await db.collection('structures').countDocuments();
        stats.conseillersCount = await db.collection('conseillers').countDocuments();
        stats.matchingsCount = await db.collection('misesEnRelation').estimatedDocumentCount();
        stats.structuresEnAttenteCount = await db.collection('structures').countDocuments({ 'userCreated': false });
        stats.structuresValideesCount = await db.collection('structures').countDocuments({ 'statut': 'VALIDATION_COSELEC' });
        stats.structuresActiveesCount = await db.collection('structures').countDocuments({ 'userCreated': true });
        stats.structuresQuiRecrutentCount = await db.collection('misesEnRelation').aggregate(
          [
            { $match: { $or: [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }] } },
            { $group: { _id: '$structureObj._id' } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ]).toArray();
        stats.structuresQuiRecrutentCount = stats.structuresQuiRecrutentCount.length > 0 ? stats.structuresQuiRecrutentCount[0].count : 0;
        stats.conseillersRecrutesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'recrutee' });
        stats.conseillersRecrutesFinalisesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'finalisee' });
        res.send(stats);
      });
    });

    //Statistiques CRA du conseiller
    app.post('/stats/cra', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role conseiller
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const conseillerUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });

        if (!conseillerUser?.roles.includes('conseiller') && !conseillerUser?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Verification du conseiller associé à l'utilisateur correspondant
        const id = conseillerUser?.roles.includes('admin_coop') ? req.body.idConseiller : conseillerUser.entity.oid;

        const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(id) });
        if (conseiller?._id.toString() !== req.body?.idConseiller.toString()) {
          res.status(403).send(new Forbidden('User not authorized', {
            conseillerId: req.body.idConseiller
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.body?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.body?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        let query = {
          'conseiller.$id': new ObjectID(conseiller._id),
          'createdAt': {
            $gte: dateDebut,
            $lt: dateFin,
          }
        };

        //Construction des statistiques
        let stats = await statsCras.getStatsGlobales(db, query, statsCras);

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/statistiques.pdf', async (req, res) => {
      app.get('mongoClient').then(async db => {
        logger.info('Début de la fct de génération de pdf');
        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        logger.info('Authentification présente');
        try {
          let userId = decode(accessToken).sub;
          const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
          if (!user?.roles.includes('admin_coop')) {
            res.status(403).send(new Forbidden('User not authorized', {
              userId: userId
            }).toJSON());
            return;
          }
          logger.info('User avec le bon rôle');
          const dateDebut = dayjs(req.query.dateDebut).format('YYYY-MM-DD');
          const dateFin = dayjs(req.query.dateFin).format('YYYY-MM-DD');
          const type = req.query.type;
          const idType = req.query.idType === 'undefined' ? '' : req.query.idType + '/';

          const schema = Joi.object({
            dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
            dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
            type: Joi.string().required().error(new Error('Le type de territoire est invalide')),
            idType: Joi.required().error(new Error('L\'id du territoire invalide')),
          }).validate(req.query);

          if (schema.error) {
            res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
            return;
          }

          let finUrl = '/' + type + '/' + idType + dateDebut + '/' + dateFin;
          logger.info(finUrl);
          logger.info(app.get('espace_coop_hostname'));
          /** Ouverture d'un navigateur en headless afin de générer le PDF **/
          const browser = await puppeteer.launch();

          browser.on('targetchanged', async target => {
            const targetPage = await target.page();
            const client = await targetPage.target().createCDPSession();
            logger.info('client récupéré');
            await client.send('Runtime.evaluate', {
              expression: `localStorage.setItem('user', '{"accessToken":"${accessToken}",` +
              `"authentication":{` +
                `"strategy":"local",` +
                `"accessToken":"${accessToken}"},` +
              `"user":${JSON.stringify(user)}}')`
            });
          });
          logger.info('Création du client');
          logger.info('Avant const page');
          const page = await browser.newPage();

          await page.goto(app.get('espace_coop_hostname') + '/statistiques' + finUrl, { waitUntil: 'networkidle0' });

          logger.info('Atterissage sur la page statistiques');
          await page.waitForTimeout(500);

          let pdf;
          await Promise.all([
            page.addStyleTag({ content: '#burgerMenu { display: none} .no-print { display: none }' }),
            pdf = page.pdf({ format: 'A4', printBackground: true })
          ]);
          logger.info('Génération du pdf');
          await browser.close();

          res.contentType('application/pdf');
          pdf.then(buffer => res.send(buffer));
          logger.info('Envoi du pdf');

          /*
         try {
            await statsPdf.generatePdf(app, res, logger, accessToken, user, finUrl);

            return;
          } catch (error) {
            app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).send(new GeneralError('Une erreur est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
            return;
          }*/
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('Une erreur d\'authentification est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
          return;
        }
      });
    });

    app.get('/stats/admincoop/dashboard', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role admin_coop
      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Construction des statistiques
        let stats = {};

        //Total cras
        stats.nbCras = await db.collection('cras').estimatedDocumentCount();
        //Total accompagnement
        let nbAccompagnements = await db.collection('cras').aggregate(
          { $group:
            { _id: null, count: { $sum: { $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] } } }
          },
          { $project: { 'valeur': '$count' } }
        ).toArray();
        stats.totalAccompagnements = nbAccompagnements[0].count;

        //Conseillers enregistrés
        stats.conseillersEnregistres = await db.collection('users').countDocuments({
          'roles': { $in: ['conseiller'] },
          'passwordCreated': true
        });

        const conseillersNonEnregistres = await db.collection('users').countDocuments({
          'roles': { $in: ['conseiller'] },
          'passwordCreated': false
        });

        stats.invitationsEnvoyees = conseillersNonEnregistres + stats.conseillersEnregistres;
        stats.tauxActivationComptes = stats.invitationsEnvoyees > 0 ? Math.round(stats.conseillersEnregistres * 100 / stats.invitationsEnvoyees) : 0;

        //Utilise Pix Orga
        stats.utilisePixOrga = await db.collection('conseiller').countDocuments({
          'statut': 'RECRUTE'
          //PixOrga ?
        });

        //Utilise rdv solidarité
        stats.utiliseRdvSolidarites = await db.collection('conseiller').countDocuments({
          'statut': 'RECRUTE'
          //Rdv solidarité ?
        });

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/territoires', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }

      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const schema = Joi.object({
          page: Joi.number().required().error(new Error('Le numéro de page est invalide')),
          territoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
          dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
          dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
          nomOrdre: Joi.string().required().error(new Error('Le nom de l\'ordre est invalide')),
          ordre: Joi.number().required().error(new Error('L\'ordre est invalide')),
        }).validate(req.query);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        const { page, territoire, nomOrdre, ordre } = req.query;
        const dateFin = dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY');
        const dateDebutQuery = new Date(req.query.dateDebut);
        const dateFinQuery = new Date(req.query.dateFin);

        //Construction des statistiques
        let items = {};
        let statsTerritoires = [];
        let ordreColonne = JSON.parse('{"' + nomOrdre + '":' + ordre + '}');
        let promises = [];

        if (territoire === 'codeDepartement') {

          statsTerritoires = await db.collection('stats_Territoires').find({ 'date': dateFin })
          .sort(ordreColonne)
          .skip(page > 0 ? ((page - 1) * options.paginate.default) : 0)
          .limit(options.paginate.default).toArray();

          statsTerritoires.forEach(ligneStats => {
            if (ligneStats.conseillerIds.length > 0) {
              let query = { 'conseiller.$id': { $in: ligneStats.conseillerIds }, 'createdAt': {
                '$gte': dateDebutQuery,
                '$lte': dateFinQuery,
              } };

              promises.push(new Promise(async resolve => {
                let countAccompagnees = await statsCras.getPersonnesAccompagnees(db, query);
                ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;
                resolve();
              }));
            } else {
              ligneStats.personnesAccompagnees = 0;
            }
          });
          await Promise.all(promises);
          items.total = await db.collection('stats_Territoires').countDocuments({ 'date': dateFin });
        }

        if (territoire === 'codeRegion') {
          statsTerritoires = await db.collection('stats_Territoires').aggregate(
            { $match: { date: dateFin } },
            { $group: {
              _id: {
                codeRegion: '$codeRegion',
                nomRegion: '$nomRegion',
              },
              nombreConseillersCoselec: { $sum: '$nombreConseillersCoselec' },
              cnfsActives: { $sum: '$cnfsActives' },
              cnfsInactives: { $sum: '$cnfsInactives' },
              conseillerIds: { $push: '$conseillerIds' }
            } },
            { $addFields: { 'codeRegion': '$_id.codeRegion', 'nomRegion': '$_id.nomRegion' } },
            { $project: {
              _id: 0, codeRegion: 1, nomRegion: 1, nombreConseillersCoselec: 1, cnfsActives: 1, cnfsInactives: 1,
              conseillerIds: { $reduce: {
                input: '$conseillerIds',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              } }
            } },
            { $sort: ordreColonne },
            { $skip: page > 0 ? ((page - 1) * options.paginate.default) : 0 },
            { $limit: options.paginate.default },

          ).toArray();

          statsTerritoires.forEach(ligneStats => {
            ligneStats.tauxActivation = (ligneStats?.nombreConseillersCoselec) ?
              Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;

            ligneStats.personnesAccompagnees = 0;
            if (ligneStats.conseillerIds.length > 0) {
              let query = { 'conseiller.$id': { $in: ligneStats.conseillerIds }, 'createdAt': {
                '$gte': dateDebutQuery,
                '$lte': dateFinQuery,
              } };

              promises.push(new Promise(async resolve => {
                let countAccompagnees = await statsCras.getPersonnesAccompagnees(db, query);
                ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;
                resolve();
              }));
            } else {
              ligneStats.personnesAccompagnees = 0;
            }
          });
          await Promise.all(promises);

          const statsTotal = await db.collection('stats_Territoires').aggregate(
            { $match: { date: dateFin } },
            { $group: { _id: { codeRegion: '$codeRegion' } } },
            { $project: { _id: 0 } }
          ).toArray();

          items.total = statsTotal.length;
        }

        items.data = statsTerritoires;
        items.limit = options.paginate.default;
        items.skip = page;

        res.send({ items: items });
      });
    });

    app.get('/stats/territoire/cra', async (req, res) => {

      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role admin_coop
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!user?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        const conseillerIds = JSON.parse(req.query?.conseillerIds);
        //Construction des statistiques
        let stats = {};

        if (conseillerIds) {
          let ids = [];
          ids = conseillerIds.map(id => new ObjectID(id));
          let query = {
            'createdAt': {
              '$gte': dateDebut,
              '$lt': dateFin,
            },
            'conseiller.$id': { $in: ids },
          };

          stats = await statsCras.getStatsGlobales(db, query, statsCras);
        }

        res.send(stats);
      });
    });

    app.get('/stats/nationales/cra', async (req, res) => {

      app.get('mongoClient').then(async db => {

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role admin_coop
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!user?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);

        let query = {
          'createdAt': {
            '$gte': dateDebut,
            '$lt': dateFin,
          }
        };

        let stats = await statsCras.getStatsGlobales(db, query, statsCras);

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/territoire', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const schema = Joi.object({
          typeTerritoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
          idTerritoire: Joi.string().min(2).max(3).required().error(new Error('L\'id du territoire est invalide')),
          dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
        }).validate(req.query);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        const { typeTerritoire, idTerritoire } = req.query;
        const dateFin = dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY');

        try {
          let territoire = await db.collection('stats_Territoires').findOne({ 'date': dateFin, [typeTerritoire]: idTerritoire });
          res.send(territoire);
          return;
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }
      });
    });
  }
};
