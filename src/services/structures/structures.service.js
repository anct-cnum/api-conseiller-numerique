// Initializes the `structures` service on path `/structures`
const { Structures } = require('./structures.class');
const hooks = require('./structures.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/structures', new Structures(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('structures');

  service.hooks(hooks);
};
