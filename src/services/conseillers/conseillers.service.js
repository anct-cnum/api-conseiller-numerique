// Initializes the `conseillers` service on path `/conseillers`
const { Conseillers } = require('./conseillers.class');
const hooks = require('./conseillers.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate'),
    whitelist: ['$text', '$search', '$language'], // fields used by feathers-mongodb-fuzzy-search
  };

  // Initialize our service with any options it requires
  app.use('/conseillers', new Conseillers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillers');

  service.hooks(hooks);
};
