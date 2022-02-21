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

        //Separation CP / ville et suppression de cp plus utile
        context.data.cra.codePostal = context.data.cra.cp.slice(0, 5);
        context.data.cra.nomCommune = context.data.cra.cp.slice(6);

        //Ajout de la date de création
        context.data.createdAt = new Date();
        delete context.data.cra.datePickerStatus;
        context.data.cra.dateAccompagnement = new Date(context.data.cra.dateAccompagnement);

        //Suppression des champs en trop
        delete context.data.idConseiller;
        delete context.data.cra.cp;
        delete context.data.cra.nbParticipantsAge;
        delete context.data.cra.nbParticipantsStatut;

        //Validation des données cra
        const schema = Joi.object({

          codePostal: Joi.string().required().min(5).max(5).error(new Error('Le code postal est invalide')),
          nomCommune: Joi.string().required().error(new Error('Le nom de la commune est invalide')),
          canal: Joi.string().required().valid('rattachement', 'autre', 'distance', 'domicile').error(new Error('Le canal est invalide')),
          activite: Joi.string().required().valid('individuel', 'collectif', 'ponctuel').error(new Error('L\'activité est invalide')),
          nbParticipants: Joi.number().integer().required().min(1).max(100).error(new Error('Le nombre de participants est invalide')),
          nbParticipantsRecurrents: Joi.number().integer().allow(null).min(1).max(100).error(new Error('Le nombre de participants est invalide')),
          age: Joi.object({
            moins12ans: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes de moins de 12 ans est invalide')),
            de12a18ans: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes entre 12 et 18 ans est invalide')),
            de18a35ans: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes entre 18 et 35 ans est invalide')),
            de35a60ans: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes entre 35 et 60 ans est invalide')),
            plus60ans: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes de plus de 60 ans est invalide')),
          }),
          statut: Joi.object({
            etudiant: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre d\'étudiants est invalide')),
            sansEmploi: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes sans emploi est invalide')),
            enEmploi: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes en emploi est invalide')),
            retraite: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de retraités est invalide')),
            // eslint-disable-next-line max-len
            heterogene: Joi.number().integer().required().min(0).max(100).error(new Error('Le nombre de personnes non-renseignées ou groupe hétérogène est invalide')),
          }),
          // eslint-disable-next-line max-len
          themes: Joi.array().required().min(1).max(13).items(Joi.string().required().valid('equipement informatique', 'vocabulaire', 'internet', 'securite', 'courriel', 'echanger', 'traitement texte', 'contenus numeriques', 'trouver emploi', 'tpe/pme', 'accompagner enfant', 'demarche en ligne', 'fraude et harcelement', 'sante', 'smartphone')).error(new Error('Le thème est invalide')),
          duree: Joi.any().required().error(new Error('La durée est invalide')),
          accompagnement: Joi.string().required().valid('individuel', 'atelier', 'redirection').allow(null).error(new Error('L\'accompagnement est invalide')),
          dateAccompagnement: Joi.date().min(new Date('2020-01-01T00:00:00.000Z')).max('now').required().error(new Error('La date est invalide')),
          organisme: Joi.string().required().allow(null).error(new Error('L\'organisme de l\'accompagnement est invalide'))
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
