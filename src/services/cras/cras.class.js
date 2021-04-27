const { Service } = require('feathers-mongodb');

exports.Cras = class Cras extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('cras');
    });
  }
};
