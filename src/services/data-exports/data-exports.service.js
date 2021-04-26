// Initializes the `dataExports` service on path `/data-exports`
const { DataExports } = require('./data-exports.class');
const hooks = require('./data-exports.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/data-exports', new DataExports(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('data-exports');

  service.hooks(hooks);
};
