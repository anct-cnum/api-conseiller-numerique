const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest, Forbidden } = require('@feathersjs/errors');
const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const database = connection.substr(connection.lastIndexOf('/') + 1);
const checkPermissions = require('feathers-permissions');
const { validationCra } = require('./cra/utils/validationCra');

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
      context => {
        //vérification du role conseiller du user
        if (!context.params?.user?.roles.includes('conseiller')) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }

        //Creation DBRef conseillers et suppression de l'idConseiller plus utile
        context.data.conseiller = new DBRef('conseillers', new ObjectId(context.data.idConseiller), database);
        context.data.structure = new DBRef('structures', new ObjectId(context.data.idStructure), database);
        if (context.data.cra.idPermanence) {
          context.data.permanence = new DBRef('permanences', new ObjectId(context.data.cra.idPermanence), database);
        }

        //Separation CP / ville et suppression de cp plus utile
        context.data.cra.codePostal = context.data.cra.cp.slice(0, 5);
        context.data.cra.nomCommune = context.data.cra.cp.slice(6).toUpperCase();

        //Ajout de la date de création
        context.data.createdAt = new Date();
        delete context.data.cra.datePickerStatus;
        context.data.cra.dateAccompagnement = new Date(context.data.cra.dateAccompagnement);

        //Suppression des champs en trop
        delete context.data.idConseiller;
        delete context.data.cra.idPermanence;
        delete context.data.idStructure;
        delete context.data.cra.cp;

        //Validation des données cra
        const error = validationCra(context.data.cra);
        if (error) {
          throw new BadRequest(error);
        } else {
          return context;
        }
      }
    ],
    update: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    patch: [
      context => {
        //vérification du rôle conseiller du user
        if (!context.params?.user?.roles.includes('conseiller')) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }
        return context;
      }
    ],
    remove: [
      checkPermissions({
        roles: ['admin', 'conseiller'],
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
