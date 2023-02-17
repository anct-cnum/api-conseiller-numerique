// Initializes the `logs` service on path `/logs`
const { AccessLogs } = require('./accessLogs.class');
const hooks = require('./accessLogs.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/Accesslogs', new AccessLogs(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('Accesslogs');

  service.hooks(hooks);
};
