const { authenticate } = require('@feathersjs/authentication').hooks;
const { Forbidden } = require('@feathersjs/errors');
const checkPermissions = require('feathers-permissions');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'conseiller'],
        field: 'roles',
      })
    ],
    find: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    get: [
      async context => {
        //Restreindre les permissions : les conseillers ne peuvent voir que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller')) {
          const cra = await context.app.service('cras').get(context.id);
          if (context.params?.user?.entity?.oid.toString() !== cra?.conseiller?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    create: [
      () => {
        throw new Forbidden('Vous n\'avez pas l\'autorisation');
      }
    ],
    update: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    patch: [
      () => {
        throw new Forbidden('Vous n\'avez pas l\'autorisation');
      }
    ],
    remove: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ]
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
