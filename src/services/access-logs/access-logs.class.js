const { Service } = require('feathers-mongodb');

exports.AccessLogs = class AccessLogs extends Service {
  constructor(options, app) {
    super(options);
    
    app.get('mongoClient').then(db => {
      this.Model = db.collection('accessLogs');
    });
  }
};
