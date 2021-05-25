const { Service } = require('feathers-mongodb');

exports.Metabase = class Metabase extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('metabase');
    });
  }
};
