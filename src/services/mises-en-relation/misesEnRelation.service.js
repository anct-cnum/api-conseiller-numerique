// Initializes the `misesEnRelation` service on path `/misesEnRelation`
const { MisesEnRelation } = require('./misesEnRelation.class');
const hooks = require('./misesEnRelation.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/misesEnRelation', new MisesEnRelation(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('misesEnRelation');

  service.hooks(hooks);
};
