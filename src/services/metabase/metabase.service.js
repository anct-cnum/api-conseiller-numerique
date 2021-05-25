// Initializes the `metabase` service on path `/metabase`
const { Metabase } = require('./metabase.class');
const hooks = require('./metabase.hooks');

module.exports = function(app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/metabase', new Metabase(options, app));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('metabase');

  service.hooks(hooks);
};
