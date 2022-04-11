const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const checkPermissions = require('feathers-permissions');

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt'),
      search({ escape: false })],
    get: [authenticate('jwt'),
      checkPermissions({
        roles: ['conseiller', 'admin_coop', 'structure_coop', 'hub_coop'],
        field: 'roles',
      })],
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
