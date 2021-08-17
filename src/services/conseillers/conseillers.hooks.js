const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const { Forbidden } = require('@feathersjs/errors');
const checkPermissions = require('feathers-permissions');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller', 'admin_coop', 'candidat'],
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
        //Restreindre les permissions : les conseillers et candidats ne peuvent voir que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller') || context.params?.user?.roles.includes('candidat')) {
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
        roles: ['admin', 'conseiller', 'admin_coop', 'candidat'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers et candidats ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller') || context.params?.user?.roles.includes('candidat')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    patch: [
      checkPermissions({
        roles: ['admin', 'conseiller', 'admin_coop', 'candidat'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers et candidats ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller') || context.params?.user?.roles.includes('candidat')) {
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
                    'structure.$id': context.params?.user.entity.oid,
                    'conseiller.$id': conseiller._id
                  });
                if (miseEnRelationCount === 0) {
                  const dejaFinalisee = await db.collection('misesEnRelation').countDocuments(
                    {
                      'statut': 'finalisee',
                      'conseiller.$id': conseiller._id
                    });

                  if (dejaFinalisee === 1) {
                    conseiller.finalisee = true;
                  }
                  result.push(conseiller);
                }
                context.result.data = result;
                resolve();
              });
              promises.push(p);
            });
            await Promise.all(promises);
            resolve();
          });
        });
        await p;
      }
    }],
    get: [async context => {
      if (context.params?.user?.roles.includes('structure') || context.params?.user?.roles.includes('prefet') ||
          context.params?.user?.roles.includes('admin')) {
        const p = new Promise(resolve => {
          const result = context.app.get('mongoClient').then(async db => {

            if (context.params?.user?.roles.includes('structure')) {
              const miseEnRelationRecrutee = await db.collection('misesEnRelation').findOne(
                {
                  '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }],
                  'conseiller.$id': context.result._id,
                  'dateRecrutement': { $ne: null },
                  'structure.$id': context.params?.user?.entity?.oid
                }
              );

              context.result.dateRecrutement = [miseEnRelationRecrutee?.dateRecrutement];
            } else {
              const miseEnRelationRecrutees = await db.collection('misesEnRelation').find(
                {
                  '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }],
                  'dateRecrutement': { $ne: null },
                  'conseiller.$id': context.result._id
                }
              ).toArray();

              let dateRecrutement = [];
              let nomStructures = [];
              miseEnRelationRecrutees.forEach(miseEnRelationRecrutee => {
                dateRecrutement.push(miseEnRelationRecrutee?.dateRecrutement);
                nomStructures.push(miseEnRelationRecrutee?.structureObj?.nom);
              });
              context.result.dateRecrutement = dateRecrutement;
              context.result.nomStructures = nomStructures;
            }
            return context;
          });
          resolve(result);
        });
        return await p;
      }
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
