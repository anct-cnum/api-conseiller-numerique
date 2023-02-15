const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth } = require('@feathersjs/authentication-oauth');

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

  app.service('authentication').hooks({
    after: {
      create: [
        async context => {
          try {
            if (context.data.strategy === 'local') {
              const db = await app.get('mongoClient');
              await db.collection('logs').insertOne({ name: context.data.name, time: new Date(), ip: context.params.ip });
            }
          } catch (error) {
            throw new Error(error);
          }
        }
      ]
    },
    error: {
      create: [
        async context => {
          try {
            if (context.data.strategy === 'local') {
              const db = await app.get('mongoClient');
              await db.collection('logs').insertOne({ name: context.data.name, time: new Date(), ip: context.params.ip, connexionError: true });
            }
          } catch (error) {
            throw new Error(error);
          }
        }
      ]
    }
  });
};
