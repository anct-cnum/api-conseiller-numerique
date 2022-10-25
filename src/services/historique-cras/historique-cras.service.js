// Initializes the `historique-cras` service on path `/historique-cras`
const { HistoriqueCras } = require('./historique-cras.class');
const hooks = require('./historique-cras.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/historique-cras', new HistoriqueCras(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('historique-cras');

  service.hooks(hooks);
};
