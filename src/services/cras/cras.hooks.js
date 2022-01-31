const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest, Forbidden } = require('@feathersjs/errors');
const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const database = connection.substr(connection.lastIndexOf('/') + 1);
const Joi = require('joi');
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
      context => {
        //vérification du role conseiller du user
        if (!context.params?.user?.roles.includes('conseiller')) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }

        //Creation DBRef conseillers et suppression de l'idConseiller plus utile
        context.data.conseiller = new DBRef('conseillers', new ObjectId(context.data.idConseiller), database);
        delete context.data.idConseiller;

        //Separation CP / ville et suppression de cp plus utile
        context.data.cra.codePostal = context.data.cra.cp.slice(0, 5);
        context.data.cra.nomCommune = context.data.cra.cp.slice(6);
        delete context.data.cra.cp;

        //Ajout de la date de création
        context.data.createdAt = new Date();

        //Validation des données cra
        const schema = Joi.object({

          codePostal: Joi.string().required().min(5).max(5).error(new Error('Le code postal est invalide')),
          nomCommune: Joi.string().required().error(new Error('Le nom de la commune est invalide')),
          canal: Joi.string().required().valid('rattachement', 'autre', 'distance', 'domicile').error(new Error('Le canal est invalide')),
          activite: Joi.string().required().valid('individuel', 'collectif', 'ponctuel').error(new Error('L\'activité est invalide')),
          nbParticipants: Joi.number().integer().required().min(1).max(100).error(new Error('Le nombre de participants est invalide')),
          age: Joi.string().required().valid('-12', '12-18', '18-35', '35-60', '+60').error(new Error('La catégorie d\'âge est invalide')),
          statut: Joi.string().required().valid('etudiant', 'sans emploi', 'en emploi', 'retraite', 'heterogene').error(new Error('Le statut est invalide')),
          // eslint-disable-next-line max-len
          themes: Joi.array().required().min(1).max(13).items(Joi.string().required().valid('equipement informatique', 'vocabulaire', 'internet', 'securite', 'courriel', 'echanger', 'traitement texte', 'contenus numeriques', 'trouver emploi', 'tpe/pme', 'accompagner enfant', 'demarche en ligne', 'fraude et harcelement', 'sante', 'autre')).error(new Error('Le thème est invalide')),
          duree: Joi.any().required().error(new Error('La durée est invalide')),
          accompagnement: Joi.string().required().valid('individuel', 'atelier', 'redirection').allow(null).error(new Error('L\'accompagnement est invalide'))

        }).validate(context.data.cra);

        if (schema.error) {
          throw new BadRequest(schema.error);
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
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
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
