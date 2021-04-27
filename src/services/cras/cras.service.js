// Initializes the `cras` service on path `/cras`
const { Cras } = require('./cras.class');
const hooks = require('./cras.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/cras', new Cras(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('cras');

  service.hooks(hooks);
};
