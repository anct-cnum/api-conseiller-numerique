const { Service } = require('feathers-mongodb');

exports.Structures = class Structures extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('structures');
    });
  }
};
