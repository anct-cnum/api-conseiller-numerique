const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth } = require('@feathersjs/authentication-oauth');
const hooks = require('./authentication.hooks');

class InsensitiveLocalStrategy extends LocalStrategy {
  async getEntityQuery(query) {
    query.name = query.name.toLowerCase();
    return {
      ...query,
      $limit: 1
    };
  }
}

module.exports = app => {
  const authentication = new AuthenticationService(app);

  authentication.register('jwt', new JWTStrategy());
  authentication.register('local', new InsensitiveLocalStrategy());

  app.use('/authentication', authentication);
  app.configure(expressOauth());

  const service = app.service('authentication');
  service.hooks(hooks);
};
