const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const { Forbidden } = require('@feathersjs/errors');
const checkPermissions = require('feathers-permissions');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller'],
        field: 'roles',
      })
    ],
    find: [
      context => {
        if (context.params.query.$search) {
          context.params.query.$search = '"' + context.params.query.$search + '"';
        }
        return context;
      }, search({ escape: false })],
    get: [
      async context => {
        //Restreindre les permissions : les conseillers ne peuvent voir que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    create: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    update: [
      checkPermissions({
        roles: ['admin', 'conseiller'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    patch: [
      checkPermissions({
        roles: ['admin', 'conseiller'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
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
    find: [async context => {
      if (context.params?.user?.roles.includes('structure')) {
        const p = new Promise(resolve => {
          context.app.get('mongoClient').then(async db => {
            let promises = [];
            let result = [];
            context.result.data.filter(async conseiller => {
              const p = new Promise(async resolve => {
                let miseEnRelationCount = await db.collection('misesEnRelation').countDocuments(
                  {
                    'conseillerObj._id': conseiller._id
                  });
                resolve();
                if (miseEnRelationCount === 0) {
                  result.push(conseiller);
                }
              });
              promises.push(p);
            });
            await Promise.all(promises);
            context.result.data = result;
            resolve();
          });
        });
        await p;
      }
    }],
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
