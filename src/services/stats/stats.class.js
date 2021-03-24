const { Service } = require('feathers-mongodb');

exports.Stats = class Stats extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('stats');
    });

    app.get('/dashboard', async (req, res) => {
      app.get('mongoClient').then(async db => {
        let stats = {};
        stats.structuresCount = await db.collection('structures').countDocuments();
        stats.conseillersCount = await db.collection('conseillers').countDocuments();
        stats.conseillersRecrutesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'recrutee' });
        res.send(stats);
      });
    });
  }
};
