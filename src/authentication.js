const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth } = require('@feathersjs/authentication-oauth');

class InsensitiveLocalStrategy extends LocalStrategy {
  async getEntityQuery(query, params) {
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
};
