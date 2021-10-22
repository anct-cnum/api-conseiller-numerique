// Initializes the `ressources` service on path `/ressources`
const { Ressources } = require('./ressources.class');
const hooks = require('./ressources.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate_resourcerie'),
    whitelist: ['$text', '$search']
  };

  // Initialize our service with any options it requires
  app.use('/ressources', new Ressources(options, app));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('ressources');

  service.hooks(hooks);
};
