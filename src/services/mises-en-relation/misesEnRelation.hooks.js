const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const { NotFound, Forbidden, BadRequest } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const utils = require('../../utils/index.js');
const checkPermissions = require('feathers-permissions');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet'],
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
    get: [],
    create: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    update: [
      context => {
        //vérification du role structure du user
        if (!context.params?.user?.roles.includes('structure')) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }

        context.data.dateRecrutement = parseStringToDate(context.data.dateRecrutement);

        return context;
      }
    ],
    patch: [
      async context => {
        //vérification du role structure du user
        if (!context.params?.user?.roles.includes('structure')) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }
        //Vérification  par rapport à la limite coselect si passage d'un conseiller en recrutee
        if (context.data?.statut === 'recrutee') {
          const structureId = context.params?.user?.entity?.oid;
          const structure = await context.app.service('structures').get(structureId);
          //Vérification si structure non null
          if (structure === null) {
            throw new NotFound('Structure introuvable avec l\'id : ', structureId);
          }
          //Vérification de la présence d'une date de recrutement
          const misesEnRelationRecrutee = await context.app.service('misesEnRelation').find({
            query: { '_id': new ObjectID(context.id) }
          });
          if (misesEnRelationRecrutee.data[0].dateRecrutement === null) {
            throw new BadRequest('La date de recrutement doit être obligatoirement renseignée !');
          }
          //Limite du nombre de candidats à recruter
          let dernierCoselec = utils.getCoselec(structure);
          if (dernierCoselec !== null) {
            //Nombre de candidats déjà recrutés pour cette structure
            const misesEnRelationRecrutees = await context.app.service('misesEnRelation').find({
              query: {
                'statut': { $in: ['recrutee', 'finalisee'] },
                'structure.$id': new ObjectID(structureId)
              },
              paginate: false //important pour ne pas être limité par la pagination
            });
            if (misesEnRelationRecrutees.length >= dernierCoselec.nombreConseillersCoselec) {
              //eslint-disable-next-line max-len
              throw new Forbidden('Action non autorisée : quota atteint de conseillers validés par rapport au nombre de postes attribués', dernierCoselec.nombreConseillersCoselec);
            }
          }
        }
        if (context.data.dateRecrutement) {
          context.data.dateRecrutement = parseStringToDate(context.data.dateRecrutement);
        }
        return context;
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

//Parse string to date
function parseStringToDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date;
}
