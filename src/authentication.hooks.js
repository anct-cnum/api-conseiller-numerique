// Application hooks that run for every service

const { Forbidden } = require('@feathersjs/errors');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async context => {
        try {
          if (context.data.strategy === 'local') {
            const db = await context.app.get('mongoClient');
            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, createdAt: new Date(), ip: context.params.ip });
            await db.collection('users')
            .updateOne({ name: context.data.name }, { $set: { lastLogin: new Date() } });
          }
        } catch (error) {
          throw new Error(error);
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [
      async context => {
        try {
          if (context.data.strategy === 'local') {
            const db = await context.app.get('mongoClient');
            const user = await db.collection('users').findOne({ name: context.data.name, resetPasswordCnil: true });
            if (user) {
              context.error = new Forbidden('RESET_PASSWORD_CNIL', { resetPasswordCnil: true });
            }
            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, createdAt: new Date(), ip: context.params.ip, connexionError: true });
          }
        } catch (error) {
          throw new Error(error);
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  }
};

