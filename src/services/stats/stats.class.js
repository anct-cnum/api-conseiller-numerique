const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated, BadRequest } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const statsCras = require('./cras');
const Joi = require('joi');
const dayjs = require('dayjs');
const { EventListeners } = require('aws-sdk');

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

        //Total accompagnement
        let nbAccompagnements = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.accompagnement' },
            { $group: { _id: '$cra.accompagnement', count: { $sum: {
              $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1]
            } } } },
          ]
        ).toArray();
        stats.totalAccompagnements = 0;
        stats.totalAccompagnements += nbAccompagnements?.find(accompagnement => accompagnement._id === 'individuel')?.count ?? 0;
        stats.totalAccompagnements += nbAccompagnements?.find(accompagnement => accompagnement._id === 'atelier')?.count ?? 0;
        stats.totalAccompagnements += nbAccompagnements?.find(accompagnement => accompagnement._id === 'redirection')?.count ?? 0;

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
        let promises = [];
        let statsTerritoires = [];
        let ordreColonne = JSON.parse('{"' + nomOrdre + '":' + ordre + '}');

        if (territoire === 'departement') {

          statsTerritoires = await db.collection('stats_Territoires').find({ 'date': dateFin })
          .sort(ordreColonne)
          .skip(page > 0 ? ((page - 1) * options.paginate.default) : 0)
          .limit(options.paginate.default).toArray();


          statsTerritoires.forEach(ligneStats => {

            ligneStats.personnesAccompagnees = 0;
            let cumulTerritoire = 0;

            if (ligneStats.conseillerIds.length > 0) {
              ligneStats.conseillerIds.forEach(conseillerId => {
                let query = {
                  'conseiller.$id': new ObjectID(conseillerId),
                  'createdAt': {
                    $gte: dateDebutQuery,
                    $lt: dateFinQuery,
                  }
                };

                promises.push(new Promise(async resolve => {
                  let statsAccompagnements = await statsCras.getStatsAccompagnements(db, query);
                  if (statsAccompagnements.length > 0) {
                    // eslint-disable-next-line
                    cumulTerritoire += statsAccompagnements?.find(accompagnement => accompagnement._id === 'individuel')?.count ?? 0;
                    // eslint-disable-next-line
                    cumulTerritoire += statsAccompagnements?.find(accompagnement => accompagnement._id === 'atelier')?.count ?? 0;
                    // eslint-disable-next-line
                    cumulTerritoire += statsAccompagnements?.find(accompagnement => accompagnement._id === 'redirection')?.count ?? 0;
                  }
                  ligneStats.personnesAccompagnees = cumulTerritoire;
                  resolve();
                }));
              });
            }
          });

          await Promise.all(promises);

          items.data = statsTerritoires;
          items.total = await db.collection('stats_Territoires').countDocuments({ 'date': dateFin });
          items.limit = options.paginate.default;
          items.skip = page;
        }

        res.send({ items: items });
      });
    });

    app.post('/stats/territoire/cra', async (req, res) => {
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
        let dateDebut = new Date(req.body?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.body?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        const conseillerIds = req.body?.conseillerIds;
        let ids = [];
        conseillerIds.forEach(id => {
          ids.push(new ObjectID(id));
        });
        let query = {
          'createdAt': {
            '$gte': dateDebut,
            '$lt': dateFin,
          },
          'conseiller.$id': { $in: ids },
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
        if (ids.length === 1) {
          stats.statsEvolutions = await statsCras.getStatsEvolutions(db, ids[0]);
        } else {
          let aggregateEvol = [];
          const dateFinEvo = new Date();
          let dateDebutEvo = new Date(dateFinEvo.setMonth(dateFinEvo.getMonth() - 4));

          aggregateEvol = await db.collection('stats_conseillers_cras').aggregate(
            { $match: { 'conseiller.$id': { $in: ids } } },
            { $unwind: '$' + dateFinEvo.getFullYear() },
            { $group: { '_id': '$' + dateFinEvo.getFullYear() + '.mois',
              'totalCras': { $sum: '$' + dateFinEvo.getFullYear() + '.totalCras' } },
            },
            {
              $addFields: { 'mois': '$_id', 'annee': dateFinEvo.getFullYear() }
            },
            { $project: { mois: '$_id' } }
          ).toArray();

          stats.statsEvolutions = JSON.parse('{"' + dateFinEvo.getFullYear().toString() + '":' + JSON.stringify(aggregateEvol) + '}');

          // Si année glissante on récupère les données de l'année n-1
          if (dateDebutEvo.getFullYear() !== dateFinEvo.getFullYear()) {

            const aggregateEvolLastYear = await db.collection('stats_conseillers_cras').aggregate(
              { $match: { 'conseiller.$id': { $in: ids } } },
              { $unwind: '$' + dateDebutEvo.getFullYear() },
              { $group: { '_id': '$' + dateDebutEvo.getFullYear() + '.mois',
                'totalCras': { $sum: '$' + dateDebutEvo.getFullYear() + '.totalCras' } },
              },
              {
                $addFields: { 'mois': '$_id', 'annee': dateDebutEvo.getFullYear() }
              },
              { $project: { mois: '$_id' } }
            ).toArray();

            stats.statsEvolutions = JSON.parse('{"' +
            dateDebutEvo.getFullYear().toString() + '":' + JSON.stringify(aggregateEvolLastYear) + ',"' +
            dateFinEvo.getFullYear().toString() + '":' + JSON.stringify(aggregateEvol) + '}');
          }
        }

        stats.statsEvolutions = stats.statsEvolutions ?? {};
        res.send(stats);
      });
    });
  }
};
