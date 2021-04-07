const { authenticate } = require('@feathersjs/authentication').hooks;

/* TODO:
- seul les admin doivent pouvoir tout faire
- les structures ne peuvent modifier que les donneés qui les concernent
- les conseillers ne peuvent lire les infos que sur la structure qui le concerne
*/
module.exports = {
  before: {
    all: [authenticate('jwt')],
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
    get: [async context => {
      let lastCoselec = {};
      if (context.result.coselec !== undefined) {
        lastCoselec = context.result.coselec[context.result.coselec.length - 1];
      }
      Object.assign(context.result, lastCoselec);
      return context;
    }],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
