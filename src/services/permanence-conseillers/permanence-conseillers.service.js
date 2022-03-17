// Initializes the `permanence-conseillers` service on path `/permanence-conseillers`
const { PermanenceConseillers } = require('./permanence-conseillers.class');
const hooks = require('./permanence-conseillers.hooks');

module.exports = function(app) {
  const paginate = app.get('paginate');
  const options = {
    name: 'permanence-conseillers',
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/permanence-conseillers', new PermanenceConseillers(options, app));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('permanence-conseillers');

  service.hooks(hooks);
};
