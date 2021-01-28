// Initializes the `correspondances` service on path `/correspondances`
const { Correspondances } = require('./correspondances.class');
const hooks = require('./correspondances.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/correspondances', new Correspondances(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('correspondances');

  service.hooks(hooks);
};
