const { Service } = require('feathers-mongodb');

exports.Sondages = class Sondages extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('sondages');
    });
  }
};
