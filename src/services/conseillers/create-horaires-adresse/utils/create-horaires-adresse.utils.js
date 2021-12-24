const Joi = require('joi');

const createHorairesAdresseToSchema = body => ({
  nomEnseigne: body.NomEnseigne,
  numeroTelephone: body.NumeroTelephone,
  email: body.email,
  siteWeb: body.siteWeb,
  siret: body.siret,
  adresse: {
    numeroRue: body.numeroRue,
    rue: body.rue,
    codePostal: body.codePostal,
    ville: body.ville
  },
  horaires: {
    lundi: { matin: body.lundiMatin, apresMidi: body.lundiApresMidi },
    mardi: { matin: body.mardiMatin, apresMidi: body.mardiApresMidi },
    mercredi: { matin: body.mercrediMatin, apresMidi: body.mercrediApresMidi },
    jeudi: { matin: body.jeudiMatin, apresMidi: body.jeudiApresMidi },
    vendredi: { matin: body.vendrediMatin, apresMidi: body.vendrediApresMidi },
    samedi: { matin: body.samediMatin, apresMidi: body.samediApresMidi },
    dimanche: { matin: body.dimancheMatin, apresMidi: body.dimancheApresMidi },
  },
  itinerant: body.itinerant,
  updateAt: new Date()
});

const validateCreateHorairesAdresseSchema = createHorairesAdresseSchema => Joi.object({
  nomEnseigne: Joi.string().required().error(new Error('Le champ nom est obligatoire')),
  numeroTelephone: Joi.string().required().error(new Error('Le champ numero de téléphone est obligatoire')),
  email: Joi.string().required().error(new Error('Le champ email est obligatoire')),
  siteWeb: Joi.string().error(new Error('Le champ site web doit être un lien valide')),
  siret: Joi.number().length(14).error(new Error('Le champ SIRET doit être composé de 14 chiffres')),

  numeroRue: Joi.number().required().length(10).error(new Error('Le champ numero de rue doit être un nombre')),
  rue: Joi.string().required().error(new Error('Le champ rue est obligatoire')),
  codePostal: Joi.number().required().length(5).error(new Error('Le champ code postal doit être composé de 5 chiffres')),
  ville: Joi.string().required().error(new Error('Le champ ville est obligatoire')),

  horaires: {
    lundi: {
      matin: Joi.string().required().error(new Error('Le champ lundi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le lundi après-midi ville est obligatoire')),
    },
    mardi: {
      matin: Joi.string().required().error(new Error('Le champ mardi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le champ mardi après-midi est obligatoire')),
    },
    mercredi: {
      matin: Joi.string().required().error(new Error('Le champ mercredi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le champ mercredi après-midi est obligatoire')),
    },
    jeudi: {
      matin: Joi.string().required().error(new Error('Le champ jeudi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le champ jeudi après-midi est obligatoire')),
    },
    vendredi: {
      matin: Joi.string().required().error(new Error('Le champ vendredi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le champ vendredi après-midi est obligatoire')),
    },
    samedi: {
      matin: Joi.string().required().error(new Error('Le champ samedi matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le samedi champ après-midi est obligatoire')),
    },
    dimanche: {
      matin: Joi.string().required().error(new Error('Le champ dimanche matin est obligatoire')),
      apresMidi: Joi.string().required().error(new Error('Le champ dimanche après-midi est obligatoire')),
    },
  },

  itinerant: Joi.boolean().required().error(new Error('Le champ accompagnements en itinérance est obligatoire')),
}).validate(createHorairesAdresseSchema);

module.exports = {
  createHorairesAdresseToSchema,
  validateCreateHorairesAdresseSchema,
};
