const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('feathers-permissions');
const search = require('feathers-mongodb-fuzzy-search');

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt'),
      context => {
        if (context.params.query.$search) {
          context.params.query.$search = '"' + context.params.query.$search + '"';
        }
        return context;
      }, search({ escape: false })
    ],
    get: [authenticate('jwt'),
      checkPermissions({
        roles: ['conseiller', 'admin_coop'],
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
