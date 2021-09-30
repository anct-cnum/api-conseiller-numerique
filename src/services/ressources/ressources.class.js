const { Service } = require('feathers-mongodb');
const { NotAuthenticated } = require('@feathersjs/errors');

exports.Ressources = class Ressources extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('ressources');
    });

    app.get('/ressources/tags', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      app.get('mongoClient').then(async db => {
        const tags = await db.collection('ressources_tags').find().toArray();
        res.send({ tags: tags });
      });
    });
  }
};
