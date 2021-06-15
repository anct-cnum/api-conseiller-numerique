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

        //Nombre total d'accompagnements
        stats.nbAccompagnement = await db.collection('cras').countDocuments(query);

        //Nombre total atelier collectif + accompagnement individuel + demande ponctuel + somme total des participants (utile pour atelier collectif)
        let statsActivites = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.activite' },
            { $match: { ...query } },
            { $group: { _id: '$cra.activite', count: { $sum: 1 }, nbParticipants: { $sum: '$cra.nbParticipants' } } },
            { $group: { _id: null, listActivites: { $push: {
              'nom': '$_id',
              'valeur': '$count',
              'nbParticipants': '$nbParticipants',
            } } } },
            { $project: { '_id': 0, 'listActivites': 1 } }
          ]
        ).toArray();
        stats.nbAteliers = statsActivites[0]?.listActivites.find(activite => activite.nom === 'collectif')?.valeur ?? 0;
        stats.nbTotalParticipant = statsActivites[0]?.listActivites.find(activite => activite.nom === 'collectif')?.nbParticipants ?? 0;
        stats.nbAccompagnementPerso = statsActivites[0]?.listActivites.find(activite => activite.nom === 'individuel')?.valeur ?? 0;
        stats.nbDemandePonctuel = statsActivites[0]?.listActivites.find(activite => activite.nom === 'ponctuel')?.valeur ?? 0;

        //Accompagnement poursuivi en individuel + en aterlier collectif + redirigé
        let statsAccompagnements = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.accompagnement' },
            { $match: { ...query } },
            { $group: { _id: '$cra.accompagnement', count: { $sum: {
              $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
            } } } },
            { $group: { _id: null, listAccompagnements: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listAccompagnements': 1 } }
          ]
        ).toArray();
        // eslint-disable-next-line max-len
        stats.nbUsagersAccompagnementIndividuel = statsAccompagnements[0]?.listAccompagnements.find(accompagnement => accompagnement.nom === 'individuel')?.valeur ?? 0;
        stats.nbUsagersAtelierCollectif = statsAccompagnements[0]?.listAccompagnements.find(accompagnement => accompagnement.nom === 'atelier')?.valeur ?? 0;
        stats.nbReconduction = statsAccompagnements[0]?.listAccompagnements.find(accompagnement => accompagnement.nom === 'redirection')?.valeur ?? 0;

        //Total accompagnés
        stats.nbUsagersBeneficiantSuivi = stats.nbUsagersAccompagnementIndividuel + stats.nbUsagersAtelierCollectif + stats.nbReconduction;

        //Taux accompagnement
        // eslint-disable-next-line max-len
        stats.tauxTotalUsagersAccompagnes = stats.nbAccompagnement > 0 ? ~~(stats.nbUsagersBeneficiantSuivi / (stats.nbTotalParticipant + stats.nbAccompagnementPerso + stats.nbDemandePonctuel) * 100) : 0;

        //Thèmes (total de chaque catégorie)
        stats.statsThemes = [
          { nom: 'equipement informatique', valeur: 0 },
          { nom: 'internet', valeur: 0 },
          { nom: 'courriel', valeur: 0 },
          { nom: 'smartphone', valeur: 0 },
          { nom: 'contenus numeriques', valeur: 0 },
          { nom: 'vocabulaire', valeur: 0 },
          { nom: 'traitement texte', valeur: 0 },
          { nom: 'echanger', valeur: 0 },
          { nom: 'trouver emploi', valeur: 0 },
          { nom: 'accompagner enfant', valeur: 0 },
          { nom: 'tpe/pme', valeur: 0 },
          { nom: 'demarche en ligne', valeur: 0 },
          { nom: 'autre', valeur: 0 },
        ];
        let statsThemes = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.themes' },
            { $match: { ...query } },
            { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
            { $group: { _id: null, listThemes: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listThemes': 1 } }
          ]
        ).toArray();
        if (statsThemes.length > 0) {
          stats.statsThemes = stats.statsThemes.map(theme1 => statsThemes[0].listThemes.find(theme2 => theme1.nom === theme2.nom) || theme1);
        }

        //Canaux (total de chaque catégorie)
        stats.statsLieux = [
          { nom: 'domicile', valeur: 0 },
          { nom: 'distance', valeur: 0 },
          { nom: 'rattachement', valeur: 0 },
          { nom: 'autre', valeur: 0 },
        ];
        let statsLieux = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.canal' },
            { $match: { ...query } },
            { $group: { _id: '$cra.canal', count: { $sum: 1 } } },
            { $group: { _id: null, listLieux: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listLieux': 1 } }
          ]
        ).toArray();
        if (statsLieux.length > 0) {
          stats.statsLieux = stats.statsLieux.map(canal1 => statsLieux[0].listLieux.find(canal2 => canal1.nom === canal2.nom) || canal1);
        }

        //Duree (total de chaque catégorie)
        stats.statsDurees = [
          { nom: '0-30', valeur: 0 },
          { nom: '30-60', valeur: 0 },
          { nom: '60-120', valeur: 0 },
          { nom: '120+', valeur: 0 },
        ];
        //Gestion des categories 0-30 / 30-60
        let statsDurees = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.duree' },
            { $match: { ...query, 'cra.duree': { $in: ['0-30', '30-60'] } } },
            { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
            { $group: { _id: null, listDurees: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listDurees': 1 } }
          ]
        ).toArray();
        if (statsDurees.length > 0) {
          stats.statsDurees = stats.statsDurees.map(duree1 => statsDurees[0].listDurees.find(duree2 => duree1.nom === duree2.nom) || duree1);
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
        stats.statsDurees[stats.statsDurees.findIndex(duree => duree.nom === '60-120')].valeur = duree60.length !== 0 ? duree60[0].total : 0;

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
        stats.statsDurees[stats.statsDurees.findIndex(duree => duree.nom === '120+')].valeur = duree120.length !== 0 ? duree120[0].total : 0;

        //Catégorie d'âges (total de chaque catégorie en %)
        stats.statsAges = [
          { nom: '-12', valeur: 0 },
          { nom: '12-18', valeur: 0 },
          { nom: '18-35', valeur: 0 },
          { nom: '35-60', valeur: 0 },
          { nom: '+60', valeur: 0 },
        ];
        let statsAges = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.age' },
            { $match: { ...query } },
            { $group: { _id: '$cra.age', count: { $sum: {
              $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
            } } } },
            { $group: { _id: null, listAges: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listAges': 1 } }
          ]
        ).toArray();
        if (statsAges.length > 0) {
          stats.statsAges = stats.statsAges.map(age1 => statsAges[0].listAges.find(age2 => age1.nom === age2.nom) || age1);
          //Conversion en % total
          stats.statsAges = stats.statsAges.map(age => {
            // eslint-disable-next-line max-len
            age.valeur = stats.nbAccompagnement > 0 ? ~~(age.valeur / (stats.nbTotalParticipant + stats.nbAccompagnementPerso + stats.nbDemandePonctuel) * 100) : 0;
            return age;
          });
        }

        //Statut des usagers (total de chaque catégorie en %)
        stats.statsUsagers = [
          { label: ' test', nom: 'etudiant', valeur: 0 },
          { nom: 'sans emploi', valeur: 0 },
          { nom: 'en emploi', valeur: 0 },
          { nom: 'retraite', valeur: 0 },
          { nom: 'heterogene', valeur: 0 },
        ];
        let statsUsagers = await db.collection('cras').aggregate(
          [
            { $unwind: '$cra.statut' },
            { $match: { ...query } },
            { $group: { _id: '$cra.statut', count: { $sum: {
              $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
            } } } },
            { $group: { _id: null, listStatuts: { $push: {
              'nom': '$_id',
              'valeur': '$count',
            } } } },
            { $project: { '_id': 0, 'listStatuts': 1 } }
          ]
        ).toArray();
        if (statsUsagers.length > 0) {
          stats.statsUsagers = stats.statsUsagers.map(statut1 => statsUsagers[0].listStatuts.find(statut2 => statut1.nom === statut2.nom) || statut1);
          //Conversion en % total
          stats.statsUsagers = stats.statsUsagers.map(statut => {
            // eslint-disable-next-line max-len
            statut.valeur = stats.nbAccompagnement > 0 ? ~~(statut.valeur / (stats.nbTotalParticipant + stats.nbAccompagnementPerso + stats.nbDemandePonctuel) * 100) : 0;
            return statut;
          });
        }

        res.send(stats);
      });
    });

  }
};
