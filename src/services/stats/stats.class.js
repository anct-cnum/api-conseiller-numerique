const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated, BadRequest, GeneralError } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const statsCras = require('./cras');
const Joi = require('joi');
const dayjs = require('dayjs');
const logger = require('../../logger');
const statsPdf = require('./stats.pdf');

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
        let stats = {};

        //Nombre total d'accompagnements
        stats.nbAccompagnement = await db.collection('cras').countDocuments(query);

        //Nombre total atelier collectif + accompagnement individuel + demande ponctuel + somme total des participants (utile pour atelier collectif)
        let statsActivites = await statsCras.getStatsActivites(db, query);
        stats.nbAteliers = statsActivites?.find(activite => activite._id === 'collectif')?.count ?? 0;
        stats.nbTotalParticipant = statsActivites?.find(activite => activite._id === 'collectif')?.nbParticipants ?? 0;
        stats.nbAccompagnementPerso = statsActivites?.find(activite => activite._id === 'individuel')?.count ?? 0;
        stats.nbDemandePonctuel = statsActivites?.find(activite => activite._id === 'ponctuel')?.count ?? 0;

        //Accompagnement poursuivi en individuel + en aterlier collectif + redirigé
        let statsAccompagnements = await statsCras.getStatsAccompagnements(db, query);
        stats.nbUsagersAccompagnementIndividuel = statsAccompagnements?.find(accompagnement => accompagnement._id === 'individuel')?.count ?? 0;
        stats.nbUsagersAtelierCollectif = statsAccompagnements?.find(accompagnement => accompagnement._id === 'atelier')?.count ?? 0;
        stats.nbReconduction = statsAccompagnements?.find(accompagnement => accompagnement._id === 'redirection')?.count ?? 0;

        //Total accompagnés
        stats.nbUsagersBeneficiantSuivi = stats.nbUsagersAccompagnementIndividuel + stats.nbUsagersAtelierCollectif + stats.nbReconduction;

        //Taux accompagnement
        let totalParticipants = stats.nbTotalParticipant + stats.nbAccompagnementPerso + stats.nbDemandePonctuel;
        stats.tauxTotalUsagersAccompagnes = totalParticipants > 0 ? ~~(stats.nbUsagersBeneficiantSuivi / totalParticipants * 100) : 0;

        //Thèmes (total de chaque catégorie)
        stats.statsThemes = await statsCras.getStatsThemes(db, query);

        //Canaux (total de chaque catégorie)
        stats.statsLieux = await statsCras.getStatsCanaux(db, query);

        //Duree (total de chaque catégorie)
        stats.statsDurees = await statsCras.getStatsDurees(db, query);

        //Catégorie d'âges (total de chaque catégorie en %)
        stats.statsAges = await statsCras.getStatsAges(db, query, totalParticipants);

        //Statut des usagers (total de chaque catégorie en %)
        stats.statsUsagers = await statsCras.getStatsStatuts(db, query, totalParticipants);

        //Evolutions du nb de cras
        stats.statsEvolutions = await statsCras.getStatsEvolutions(db, conseiller._id);

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/statistiques.pdf', async (req, res) => {
      app.get('mongoClient').then(async db => {

        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        let userId = decode(accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!user?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const dateDebut = dayjs(req.query.dateDebut).format('YYYY-MM-DD');
        const dateFin = dayjs(req.query.dateFin).format('YYYY-MM-DD');
        const type = req.query.type;
        const idType = req.query.idType;

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

        let finUrl = '/' + type + '/' + idType + '/' + dateDebut + '/' + dateFin;

        /** Ouverture d'un navigateur en headless afin de générer le PDF **/
        try {
          await statsPdf.generatePdf(app, res, accessToken, user, finUrl);
          return;
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('Une erreur est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
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

          //Nombre total d'accompagnements
          stats.nbAccompagnement = await db.collection('cras').countDocuments(query);

          //Nombre total atelier collectif + accompagnement individuel + demande ponctuel + somme total des participants (utile pour atelier collectif)
          let statsActivites = await statsCras.getStatsActivites(db, query);
          stats.nbAteliers = statsActivites?.find(activite => activite._id === 'collectif')?.count ?? 0;
          stats.nbTotalParticipant = statsActivites?.find(activite => activite._id === 'collectif')?.nbParticipants ?? 0;
          stats.nbAccompagnementPerso = statsActivites?.find(activite => activite._id === 'individuel')?.count ?? 0;
          stats.nbDemandePonctuel = statsActivites?.find(activite => activite._id === 'ponctuel')?.count ?? 0;

          //Accompagnement poursuivi en individuel + en aterlier collectif + redirigé
          let statsAccompagnements = await statsCras.getStatsAccompagnements(db, query);
          stats.nbUsagersAccompagnementIndividuel = statsAccompagnements?.find(accompagnement => accompagnement._id === 'individuel')?.count ?? 0;
          stats.nbUsagersAtelierCollectif = statsAccompagnements?.find(accompagnement => accompagnement._id === 'atelier')?.count ?? 0;
          stats.nbReconduction = statsAccompagnements?.find(accompagnement => accompagnement._id === 'redirection')?.count ?? 0;

          //Total accompagnés
          stats.nbUsagersBeneficiantSuivi = stats.nbUsagersAccompagnementIndividuel + stats.nbUsagersAtelierCollectif + stats.nbReconduction;

          let totalParticipants = await statsCras.getStatsTotalParticipants(stats);

          //Taux accompagnement
          stats.tauxTotalUsagersAccompagnes = await statsCras.getStatsTauxAccompagnements(stats, totalParticipants);

          //Thèmes (total de chaque catégorie)
          stats.statsThemes = await statsCras.getStatsThemes(db, query);

          //Canaux (total de chaque catégorie)
          stats.statsLieux = await statsCras.getStatsCanaux(db, query);

          //Duree (total de chaque catégorie)
          stats.statsDurees = await statsCras.getStatsDurees(db, query);

          //Catégorie d'âges (total de chaque catégorie en %)
          stats.statsAges = await statsCras.getStatsAges(db, query, totalParticipants);

          //Statut des usagers (total de chaque catégorie en %)
          stats.statsUsagers = await statsCras.getStatsStatuts(db, query, totalParticipants);

          //Evolutions du nb de cras
          if (ids.length === 1) {
            stats.statsEvolutions = await statsCras.getStatsEvolutions(db, ids[0]);
          } else {
          //Evolutions du nb de cras sur les 4 derniers mois.
            let aggregateEvol = [];
            const dateFinEvo = new Date();
            let dateDebutEvo = new Date(dayjs(new Date()).subtract(4, 'month'));

            const dateDebutEvoYear = dateDebutEvo.getFullYear();
            const dateFinEvoYear = dateFinEvo.getFullYear();

            aggregateEvol = await db.collection('stats_conseillers_cras').aggregate(
              { $match: { 'conseiller.$id': { $in: ids } } },
              { $unwind: '$' + dateFinEvoYear },
              { $group: { '_id': '$' + dateFinEvoYear + '.mois',
                'totalCras': { $sum: '$' + dateFinEvoYear + '.totalCras' } },
              },
              {
                $addFields: { 'mois': '$_id', 'annee': dateFinEvoYear }
              },
              { $project: { mois: '$_id' } }
            ).toArray();

            stats.statsEvolutions = JSON.parse('{"' + dateFinEvoYear.toString() + '":' + JSON.stringify(aggregateEvol) + '}');

            // Si année glissante on récupère les données de l'année n-1
            if (dateDebutEvoYear !== dateFinEvoYear) {

              const aggregateEvolLastYear = await db.collection('stats_conseillers_cras').aggregate(
                { $match: { 'conseiller.$id': { $in: ids } } },
                { $unwind: '$' + dateDebutEvoYear },
                { $group: { '_id': '$' + dateDebutEvoYear + '.mois',
                  'totalCras': { $sum: '$' + dateDebutEvoYear + '.totalCras' } },
                },
                {
                  $addFields: { 'mois': '$_id', 'annee': dateDebutEvoYear }
                },
                { $project: { mois: '$_id' } }
              ).toArray();

              stats.statsEvolutions = JSON.parse('{"' +
              dateDebutEvoYear.toString() + '":' + JSON.stringify(aggregateEvolLastYear) + ',"' +
              dateFinEvoYear.toString() + '":' + JSON.stringify(aggregateEvol) + '}');
            }
          }

          stats.statsEvolutions = stats.statsEvolutions ?? {};
        }

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
