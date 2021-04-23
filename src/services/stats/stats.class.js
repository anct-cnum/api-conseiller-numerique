const { Service } = require('feathers-mongodb');

exports.Stats = class Stats extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('stats');
    });

    app.get('/stats/dashboard', async (req, res) => {
      app.get('mongoClient').then(async db => {
        let stats = {};
        stats.structuresCount = await db.collection('structures').countDocuments();
        stats.conseillersCount = await db.collection('conseillers').countDocuments();
        stats.matchingsCount = await db.collection('misesEnRelation').countDocuments();
        stats.structuresEnAttenteCount = await db.collection('structures').countDocuments({ 'userCreated': false });
        stats.structuresValideesCount = await db.collection('structures').countDocuments({ 'statut': 'VALIDATION_COSELEC' });
        stats.structuresActiveesCount = await db.collection('structures').countDocuments({ 'userCreated': true });
        stats.structuresQuiRecruteCount = await db.collection('misesEnRelation').aggregate(
          [
            { $match: { statut: 'recrutee' } },
            { $group: { _id: '$structureObj._id' } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ]).toArray();
        stats.structuresQuiRecruteCount = stats.structuresQuiRecruteCount[0].count;
        stats.conseillersRecrutesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'recrutee' });
        res.send(stats);
      });
    });
  }
};
