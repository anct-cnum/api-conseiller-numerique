const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('feathers-permissions');
const { MethodNotAllowed } = require('@feathersjs/errors');

// Writes to accessLogs only ever happen via direct MongoDB access
// (authentication.hooks.js, suppressionInactifsComptes.js), never through this API
const disallow = () => () => {
  throw new MethodNotAllowed('Cette méthode n\'est pas disponible via l\'API');
};

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    find: [],
    get: [],
    create: [disallow()],
    update: [disallow()],
    patch: [disallow()],
    remove: [disallow()]
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
