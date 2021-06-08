const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');

exports.Stats = class Stats extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('stats');
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
            { $match: { statut: 'recrutee' } },
            { $group: { _id: '$structureObj._id' } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ]).toArray();
        stats.structuresQuiRecrutentCount = stats.structuresQuiRecrutentCount[0].count;
        stats.conseillersRecrutesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'recrutee' });
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
        dateDebut.setUTCHours(0, 0, 0);
        let dateFin = new Date(req.body?.dateFin);
        dateFin.setUTCHours(23, 59, 0);
        let query = {
          'conseiller.$id': new ObjectID(conseiller._id),
          'createdAt': {
            $gte: dateDebut,
            $lt: dateFin,
          }
        };

        //Construction des statistiques
        let stats = {};
        //Nombre accompagnement total
        stats.nbAccompagnement = await db.collection('cras').countDocuments(query);
        //Nombre atelier collectif total
        stats.nbAteliers = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.activite': { $eq: 'collectif' } } },
            { $group: { _id: null, totalCollectif: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbAteliers = stats.nbAteliers.length !== 0 ? stats.nbAteliers[0].totalCollectif : 0;
        //Somme total des participants (atelier collectif)
        stats.nbTotalParticipant = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.activite': { $eq: 'collectif' }, 'cra.nbParticipants': { $ne: null } } },
            { $group: { _id: null, total: { $sum: '$cra.nbParticipants' } } }
          ]
        ).toArray();
        stats.nbTotalParticipant = stats.nbTotalParticipant.length !== 0 ? stats.nbTotalParticipant[0].total : 0;
        //Nombre accompagnement individuel total
        stats.nbAccompagnementPerso = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.activite': { $eq: 'individuel' } } },
            { $group: { _id: null, totalIndividuel: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbAccompagnementPerso = stats.nbAccompagnementPerso.length !== 0 ? stats.nbAccompagnementPerso[0].totalIndividuel : 0;
        //Nombre de demande ponctuel total
        stats.nbDemandePonctuel = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.activite': { $eq: 'ponctuel' } } },
            { $group: { _id: null, totalPonctuel: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbDemandePonctuel = stats.nbDemandePonctuel.length !== 0 ? stats.nbDemandePonctuel[0].totalPonctuel : 0;


        console.log(stats);
        res.send(stats);
      });
    });

  }
};
