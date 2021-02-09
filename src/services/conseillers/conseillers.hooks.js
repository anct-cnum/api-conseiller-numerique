const { authenticate } = require('@feathersjs/authentication').hooks;

// TODO seul les admin doivent pouvoir tout faire, les structures doivent pouvoir agir sur les conseillers qui les concernent, les conseillers ne peuvent modifier que leurs données
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
