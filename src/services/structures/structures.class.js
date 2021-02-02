const { ObjectID } = require('mongodb');

const { Service } = require('feathers-mongodb');

exports.Structures = class Structures extends Service {
  constructor(options, app) {
    super(options);

    let db;

    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
      this.Model = db.collection('structures');
    });

    app.get('/structures/:id/misesEnRelation', async (req, res) => {
      const misesEnRelationService = app.service('misesEnRelation');
      const conseillersService = app.service('conseillers');
      const conseillers = await misesEnRelationService.find();

      const findConseiller = async miseEnRelation => {
        return conseillersService.find({ query: { _id: new ObjectID(miseEnRelation.conseiller.oid) } });
      };

      const getData = async () => {
        return Promise.all(conseillers.data.map(miseEnRelation => findConseiller(miseEnRelation)));
      };

      getData().then(data => {
        conseillers.data = data;
        res.send(conseillers);
      });
    });
  }
};
