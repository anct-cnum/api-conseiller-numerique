// Initializes the `stats` service on path `/stats`
const { Stats } = require('./stats.class');
const hooks = require('./stats.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/stats', new Stats(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('stats');

  service.hooks(hooks);
};
