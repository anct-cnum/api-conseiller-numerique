// Application hooks that run for every service

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
            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, lastLoginDate: new Date(), ip: context.params.ip, connexionError: true });
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
  
