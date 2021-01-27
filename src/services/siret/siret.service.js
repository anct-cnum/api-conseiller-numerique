// Initializes the `siret` service on path `/siret`
const { Siret } = require('./siret.class');
const hooks = require('./siret.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/siret', new Siret(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('siret');

  service.hooks(hooks);
};
