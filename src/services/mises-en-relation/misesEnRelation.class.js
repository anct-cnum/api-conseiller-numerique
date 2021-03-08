const { Service } = require('feathers-mongodb');

exports.MisesEnRelation = class MisesEnRelation extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('misesEnRelation');
    });
  }
};
