const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest, Forbidden } = require('@feathersjs/errors');
const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const sentry = app.get('sentry');
const database = connection.substr(connection.lastIndexOf('/') + 1);
const Joi = require('joi');

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [
      async context => {
        console.log(sentry.captureException('olo'));
        //Ajout du controle de conseiller
        try {
          await context.app.service('conseillers').get(context.data.sondage.idConseiller);
        } catch (error) {
          sentry.captureException(error);
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }


        //Ajout de la date de création
        context.data.createdAt = new Date();

        //Creation DBRef conseillers et suppression de l'idConseiller plus utile
        try {
          context.data.conseiller = new DBRef('conseillers', new ObjectId(context.data.sondage.idConseiller), database);
          delete context.data.sondage.idConseiller;
        } catch (error) {
          sentry.captureException(error);
        }


        //Validation des données sondage
        const schema = Joi.object({
          disponible: Joi.string().required().error(new Error('La champ disponibilité est invalide')),
          contact: Joi.string().required().error(new Error('Le champ de contact est invalide')),
          nombreContact: Joi.number().required().error(new Error('Le champ nombre de contact est invalide')),
          entretien: Joi.string(),
          avis: Joi.string(),
          axeAmelioration: Joi.string(),
          precisionAvis: Joi.string(),
          precisionAxeAmelioration: Joi.string()
        }).validate(context.data.survey);

        if (schema.error) {
          throw new BadRequest(schema.error);
        } else {
          return context;
        }
      }
    ],
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
