const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest } = require('@feathersjs/errors');
const Joi = require('joi');

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [
      context => {
        //Ajout de la date de création
        context.data.createdAt = new Date();

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
