// Initializes the `accessLogs` service on path `/accessLogs`
const { AccessLogs } = require('./access-logs.class');
const hooks = require('./access-logs.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/accessLogs', new AccessLogs(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('accessLogs');

  service.hooks(hooks);
};
