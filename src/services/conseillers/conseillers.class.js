const { Service } = require('feathers-mongodb');

exports.Conseillers = class Conseillers extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('conseillers');
    });
  }
};
