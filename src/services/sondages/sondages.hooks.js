const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest, Forbidden } = require('@feathersjs/errors');
const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const database = connection.substr(connection.lastIndexOf('/') + 1);
const Joi = require('joi');
const { Pool } = require('pg');

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [
      async context => {
        //Ajout du controle de conseiller
        try {
          await context.app.service('conseillers').get(context.data.sondage.idConseiller);
        } catch (error) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }

        //Ajout de la date de création
        context.data.createdAt = new Date();

        //Creation DBRef conseillers et suppression de l'idConseiller
        try {
          context.data.conseiller = new DBRef('conseillers', new ObjectId(context.data.sondage.idConseiller), database);

        } catch (error) {
          throw new Forbidden('Vous n\'avez pas l\'autorisation');
        }

        // Modification de la disponibilité
        const updateConseillerPG = async (id, disponible) => {
          const pool = new Pool();
          try {
            const { rows } = await pool.query(`
              UPDATE djapp_coach
              SET (disponible) = ($2)
              WHERE id = $1`,
            [id, disponible]);
            return rows;
          } catch (error) {
            throw new BadRequest(`Erreur DB : ${error}`);
          }
        };

        const modifierConseiller = new Promise(resolve => {
          context.app.get('mongoClient').then(async db => {
            let conseiller = await db.collection('conseillers').findOne({ '_id': new ObjectId(context.data.sondage.idConseiller) });
            updateConseillerPG(conseiller.idPG, context.data.sondage.disponible === 'Oui');
            await db.collection('conseillers').updateOne({ '_id': new ObjectId(context.data.sondage.idConseiller) }, {
              $set: {
                'disponible': context.data.sondage.disponible === 'Oui'
              }
            });
          });
          resolve();
        }, error => {
          error('une erreur de mise à jour est survenu!');
        });
        try {
          await modifierConseiller;
          delete context.data.sondage.idConseiller;
        } catch (error) {
          throw new BadRequest(error);
        }

        //Validation des données du sondage
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
