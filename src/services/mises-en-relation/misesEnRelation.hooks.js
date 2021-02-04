const { authenticate } = require('@feathersjs/authentication').hooks;

// TODO seul les admin doivent pouvoir tout faire, les structures ne peuvent modifier que les donneés qui les concernent, les conseillers ne peuvent lire les infos que sur la mise en relation qui le concerne
module.exports = {
  before: {
    all: authenticate('jwt'),
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
