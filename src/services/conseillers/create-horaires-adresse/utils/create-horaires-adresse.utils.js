const Joi = require('joi');

const createHorairesAdresseToSchema = body => ({
  nomEnseigne: body.nomEnseigne,
  numeroTelephone: String(body.numeroTelephone),
  email: String(body.email),
  siteWeb: body.siteWeb,
  siret: body.siret,
  adresse: {
    numeroRue: body.numeroRue,
    rue: body.rue,
    codePostal: body.codePostal,
    ville: body.ville
  },
  horaires: [
    {
      matin: [body.horaires[0].matin[0], body.horaires[0].matin[1]],
      apresMidi: [body.horaires[0].apresMidi[0], body.horaires[0].apresMidi[1]]
    },
    {
      matin: [body.horaires[1].matin[0], body.horaires[1].matin[1]],
      apresMidi: [body.horaires[1].apresMidi[0], body.horaires[1].apresMidi[1]]
    },
    {
      matin: [body.horaires[2].matin[0], body.horaires[2].matin[1]],
      apresMidi: [body.horaires[2].apresMidi[0], body.horaires[2].apresMidi[1]]
    },
    {
      matin: [body.horaires[3].matin[0], body.horaires[3].matin[1]],
      apresMidi: [body.horaires[3].apresMidi[0], body.horaires[3].apresMidi[1]]
    },
    {
      matin: [body.horaires[4].matin[0], body.horaires[4].matin[1]],
      apresMidi: [body.horaires[4].apresMidi[0], body.horaires[4].apresMidi[1]]
    },
    {
      matin: [body.horaires[5].matin[0], body.horaires[5].matin[1]],
      apresMidi: [body.horaires[5].apresMidi[0], body.horaires[5].apresMidi[1]]
    },
    {
      matin: [body.horaires[6].matin[0], body.horaires[6].matin[1]],
      apresMidi: [body.horaires[6].apresMidi[0], body.horaires[6].apresMidi[1]]
    }
  ],
  itinerant: body.itinerant === 'true',
  updatedAt: new Date()
});

const validateCreateHorairesAdresseSchema = createHorairesAdresseSchema => Joi.object({
  nomEnseigne: Joi.string().required().error(new Error('Le champ nom est obligatoire')),
  numeroTelephone: Joi.string().required().error(new Error('Le champ numéro de téléphone est obligatoire')),
  email: Joi.string().required().error(new Error('Le champ email est obligatoire')),
  siret: Joi.number().error(new Error('Le champ SIRET doit être composé de 14 chiffres')),
  siteWeb: Joi.string().allow('').error(new Error('Le champ site web doit être un lien valide')),
  adresse: Joi.object({
    numeroRue: Joi.number().required().error(new Error('Le champ numéro de rue doit être un nombre')),
    rue: Joi.string().required().error(new Error('Le champ rue est obligatoire')),
    codePostal: Joi.number().required().error(new Error('Le champ code postal doit être composé de 5 chiffres')),
    ville: Joi.string().required().error(new Error('Le champ ville est obligatoire')),
  }),
  horaires: Joi.array().length(7).items(
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ lundi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ lundi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ mardi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ mardi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ mercredi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ mercredi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ jeudi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ jeudi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ vendredi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ vendredi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ samedi matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ samedi après-midi est obligatoire')),
    },
    {
      matin: Joi.array().required().length(2).error(new Error('Le champ dimanche matin est obligatoire')),
      apresMidi: Joi.array().required().length(2).error(new Error('Le champ dimanche après-midi est obligatoire')),
    }
  ),
  itinerant: Joi.boolean().required().error(new Error('Le champ accompagnements en itinérance est obligatoire')),
  updatedAt: Joi.date().required().error(new Error('La date de mise à jour doit être présente')),
}).validate(createHorairesAdresseSchema);

module.exports = {
  createHorairesAdresseToSchema,
  validateCreateHorairesAdresseSchema,
};
