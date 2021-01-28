const { Service } = require('feathers-mongodb');

exports.Correspondances = class Correspondances extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('correspondances');
    });
  }
};
