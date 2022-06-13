const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const utils = require('../../utils/index.js');
const { Forbidden } = require('@feathersjs/errors');
const checkPermissions = require('feathers-permissions');
const { ObjectID } = require('mongodb');
const { Pool } = require('pg');
const pool = new Pool();
const logger = require('../../logger');
const { isStructureDuplicate } = require('./get-strucures/utils/get-structure.utils');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'admin_coop', 'structure', 'prefet', 'conseiller', 'coordinateur_coop'],
        field: 'roles',
      })
    ],
    find: [
      checkPermissions({
        roles: ['admin', 'admin_coop', 'prefet', 'coordinateur_coop'],
        field: 'roles',
      }),
      async context => {
        if (context.params.query.createdAt && context.params.query.createdAt.$gt) {
          context.params.query.createdAt.$gt = parseStringToDate(context.params.query.createdAt.$gt);
        }
        if (context.params.query.createdAt && context.params.query.createdAt.$lt) {
          context.params.query.createdAt.$lt = parseStringToDate(context.params.query.createdAt.$lt);
        }
      }, search()],
    get: [
      async context => {
        //Restreindre les permissions : les structures ne peuvent voir que les informations les concernant
        if (context.params?.user?.roles.includes('structure')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }

        //Restreindre les permissions : les conseillers (non coordinateur) ne peuvent voir que les informations de la structure associée
        if (context.params?.user?.roles.includes('conseiller') && !context.params?.user?.roles.includes('coordinateur_coop')) {
          const conseiller = await context.app.service('conseillers').get(context.params?.user?.entity?.oid);
          if (context.id.toString() !== conseiller?.structureId.toString()) {
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
        roles: ['admin', 'structure', 'prefet'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les structures ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('structure')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    patch: [
      checkPermissions({
        roles: ['admin', 'structure', 'prefet'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les structures ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('structure')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
          context.app.get('mongoClient').then(async db => {
            try {
              const contact = context.data?.contact;
              const { idPG } = await db.collection('structures').findOne({ _id: new ObjectID(context.id) });
              await pool.query(`UPDATE djapp_hostorganization
                SET (
                      contact_first_name,
                      contact_last_name,
                      contact_job,
                      contact_phone)
                      =
                      ($2,$3,$4,$5)
                    WHERE id = $1`,
              [idPG, contact.prenom,
                contact.nom,
                contact.fonction,
                contact.telephone]);
            } catch (error) {
              logger.error(error);
              context.app.get('sentry').captureException(error);
            }
          });
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
      if (context.result.data.length > 0) {

        context.result.data.forEach(structure => {
          Object.assign(structure, { dernierCoselec: utils.getCoselec(structure) });
        });

        context.result.data = context.result.data.filter(structure => !isStructureDuplicate(structure));

        const db = await context.app.get('mongoClient');
        //Compter le nombre de candidats dont le recrutement est finalisé
        context.result.data = await Promise.all(context.result.data.map(async structure => {
          const candidatsRecrutes = await db.collection('misesEnRelation')
          .countDocuments({
            'statut': 'finalisee',
            'structure.$id': structure._id
          });

          return { ...structure, nbCandidatsRecrutes: candidatsRecrutes };
        }));
      }

      return context;
    }],
    get: [async context => {
      Object.assign(context.result, { dernierCoselec: utils.getCoselec(context.result) });
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

//Parse string to date
function parseStringToDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date;
}
