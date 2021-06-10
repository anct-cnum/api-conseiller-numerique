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

        //Accompagnement poursuivi ?
        stats.nbUsagersBeneficiantSuivi = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.accompagnement': { $ne: null } } },
            { $group: { _id: null, totalSuivi: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbUsagersBeneficiantSuivi = stats.nbUsagersBeneficiantSuivi.length !== 0 ? stats.nbUsagersBeneficiantSuivi[0].totalSuivi : 0;

        //Taux accompagnement
        stats.tauxTotalUsagersAccompagnes = stats.nbAccompagnement > 0 ? ~~(stats.nbUsagersBeneficiantSuivi / stats.nbAccompagnement * 100) : 0;

        //Accompagnement poursuivi en individuel
        stats.nbUsagersAccompagnementIndividuel = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.accompagnement': { $eq: 'individuel' } } },
            { $group: { _id: null, totalSuiviIndividuel: { $sum: 1 } } }
          ]
        ).toArray();
        // eslint-disable-next-line max-len
        stats.nbUsagersAccompagnementIndividuel = stats.nbUsagersAccompagnementIndividuel.length !== 0 ? stats.nbUsagersAccompagnementIndividuel[0].totalSuiviIndividuel : 0;

        //Accompagnement poursuivi en atelier collectif
        stats.nbUsagersAtelierCollectif = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.accompagnement': { $eq: 'atelier' } } },
            { $group: { _id: null, totalSuiviAtelier: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbUsagersAtelierCollectif = stats.nbUsagersAtelierCollectif.length !== 0 ? stats.nbUsagersAtelierCollectif[0].totalSuiviAtelier : 0;

        //Accompagnement redirigé vers un établissement agréé
        stats.nbReconduction = await db.collection('cras').aggregate(
          [
            { $match: { ...query, 'cra.accompagnement': { $eq: 'redirection' } } },
            { $group: { _id: null, totalSuiviRedirection: { $sum: 1 } } }
          ]
        ).toArray();
        stats.nbReconduction = stats.nbReconduction.length !== 0 ? stats.nbReconduction[0].totalSuiviRedirection : 0;

        //Thèmes (total de chaque)
        stats.statsThemes = [];
        let statsThemes = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.themes' },
            { $match: { ...query } },
            { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
            { $group: { _id: null, listThemes: { $push: {
              'theme': '$_id',
              'total': '$count',
            } } } },
            { $project: { '_id': 0, 'listThemes': 1 } }
          ]
        ).toArray();
        if (statsThemes.length > 0) {
          for (let theme of Object.values(statsThemes[0].listThemes)) {
            stats.statsThemes[theme.theme] = theme.total;
          }
        }

        //Canaux (total de chaque)
        stats.statsLieux = [];
        let statsLieux = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.canal' },
            { $match: { ...query } },
            { $group: { _id: '$cra.canal', count: { $sum: 1 } } },
            { $group: { _id: null, listLieux: { $push: {
              'canal': '$_id',
              'total': '$count',
            } } } },
            { $project: { '_id': 0, 'listLieux': 1 } }
          ]
        ).toArray();
        if (statsLieux.length > 0) {
          for (let canal of Object.values(statsLieux[0].listLieux)) {
            stats.statsLieux[canal.canal] = canal.total;
          }
        }

        //Duree (total de chaque)
        stats.statsDurees = [];
        //Gestion des categories 0-30 / 30-60
        let statsDurees = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.duree' },
            { $match: { ...query, 'cra.duree': { $in: ['0-30', '30-60'] } } },
            { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
            { $group: { _id: null, listDurees: { $push: {
              'duree': '$_id',
              'total': '$count',
            } } } },
            { $project: { '_id': 0, 'listDurees': 1 } }
          ]
        ).toArray();
        if (statsDurees.length > 0) {
          for (let duree of Object.values(statsDurees[0].listDurees)) {
            stats.statsDurees[duree.duree] = duree.total;
          }
        }
        //Ajout du cas spécifique 90 à 120 minutes
        let duree60 = await db.collection('cras').aggregate(
          [
            { $match: { ...query,
              $and: [
                { 'cra.duree': { $ne: ['0-30', '30-60'] } },
                { $or: [
                  { 'cra.duree': {
                    $gte: 60,
                    $lt: 120,
                  } },
                  { 'cra.duree': { $eq: '90' } } //Correspond au bouton 1h30 sans précision de duree
                ] }
              ],
            } },
            { $group: { _id: null, total: { $sum: 1 } } }
          ]
        ).toArray();
        stats.statsDurees['60-120'] = duree60.length !== 0 ? duree60[0].total : 0;

        //Ajout du cas spécifique > 120 minutes
        let duree120 = await db.collection('cras').aggregate(
          [
            { $match: { ...query,
              $and: [
                { 'cra.duree': { $ne: ['0-30', '30-60'] } },
                { 'cra.duree': {
                  $gte: 120,
                } }
              ],
            } },
            { $group: { _id: null, total: { $sum: 1 } } }
          ]
        ).toArray();
        stats.statsDurees['120+'] = duree120.length !== 0 ? duree120[0].total : 0;

        console.log(stats);
        res.send(stats);
      });
    });

  }
};
