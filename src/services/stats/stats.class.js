const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const statsCras = require('./cras');

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
        }
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!['structure'].includes(user?.roles[0])) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: user
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
        stats.matchingsCount = await db.collection('misesEnRelation').countDocuments();
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
        }
        //Verification role conseiller
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const conseillerUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!conseillerUser?.roles.includes('conseiller')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: conseillerUser
          }).toJSON());
          return;
        }

        //Verification du conseiller associé à l'utilisateur correspondant
        const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(conseillerUser.entity.oid) });
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

  }
};
