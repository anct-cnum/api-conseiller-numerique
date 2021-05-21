// Initializes the `sondages` service on path `/sondages`
const { Sondages } = require('./sondages.class');
const hooks = require('./sondages.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/sondages', new Sondages(options, app));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('sondages');

  service.hooks(hooks);
};
