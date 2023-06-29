// Initializes the `coordinateurs` service on path `/coordinateurs`
const { Coordinateurs } = require('./coordinateurs.class');
const hooks = require('./coordinateurs.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/coordinateurs', new Coordinateurs(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('coordinateurs');

  service.hooks(hooks);
};
