const Joi = require('joi');

const createHorairesAdresseToSchema = body => ({
  nomEnseigne: body.nomEnseigne,
  numeroTelephone: String(body.numeroTelephone),
  email: String(body.email),
  siteWeb: body.siteWeb,
  siret: parseInt(body.siret),
  adresse: {
    numeroRue: body.numeroRue,
    rue: body.rue,
    codePostal: body.codePostal,
    ville: body.ville
  },
  horaires: [
    { lundi: {
      matin: [body.lundiMatinDebut, body.lundiMatinFin],
      apresMidi: [body.lundiApresMidiDebut, body.lundiApresMidiFin]
    } },
    { mardi: {
      matin: [body.mardiMatinDebut, body.mardiMatinFin],
      apresMidi: [body.mardiApresMidiDebut, body.mardiApresMidiFin]
    } },
    { mercredi: {
      matin: [body.mercrediMatinDebut, body.mercrediMatinFin],
      apresMidi: [body.mercrediApresMidiDebut, body.mercrediApresMidiFin]
    } },
    { jeudi: {
      matin: [body.jeudiMatinDebut, body.jeudiMatinFin],
      apresMidi: [body.jeudiApresMidiDebut, body.jeudiApresMidiFin]
    } },
    { vendredi: {
      matin: [body.vendrediMatinDebut, body.vendrediMatinFin],
      apresMidi: [body.vendrediApresMidiDebut, body.vendrediApresMidiFin]
    } },
    { samedi: {
      matin: [body.samediMatinDebut, body.samediMatinFin],
      apresMidi: [body.samediApresMidiDebut, body.samediApresMidiFin]
    } },
    { dimanche: {
      matin: [body.dimancheMatinDebut, body.dimancheMatinFin],
      apresMidi: [body.dimancheApresMidiDebut, body.dimancheApresMidiFin]
    } },
  ],
  itinerant: body.itinerant === 'true',
  updateAt: new Date()
});
/*

*/
const validateCreateHorairesAdresseSchema = createHorairesAdresseSchema => Joi.object({
  nomEnseigne: Joi.string().required().error(new Error('Le champ nom est obligatoire')),
  numeroTelephone: Joi.string().required().error(new Error('Le champ numero de téléphone est obligatoire')),
  email: Joi.string().required().error(new Error('Le champ email est obligatoire')),
  siteWeb: Joi.string().error(new Error('Le champ site web doit être un lien valide')),
  siret: Joi.number().integer().error(new Error('Le champ SIRET doit être composé de 14 chiffres')),
  adresse: Joi.object({
    numeroRue: Joi.number().required().error(new Error('Le champ numéro de rue doit être un nombre')),
    rue: Joi.string().required().error(new Error('Le champ rue est obligatoire')),
    codePostal: Joi.number().required().error(new Error('Le champ code postal doit être composé de 5 chiffres')),
    ville: Joi.string().required().error(new Error('Le champ ville est obligatoire')),
  }),
  horaires: Joi.array().items(
    {
      lundi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ lundi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ lundi après-midi est obligatoire')),
      }),
      mardi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ mardi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ mardi après-midi est obligatoire')),
      }),
      mercredi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ mercredi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ mercredi après-midi est obligatoire')),
      }),
      jeudi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ jeudi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ jeudi après-midi est obligatoire')),
      }),
      vendredi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ vendredi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ vendredi après-midi est obligatoire')),
      }),
      samedi: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ samedi matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ samedi après-midi est obligatoire')),
      }),
      dimanche: Joi.object({
        matin: Joi.array().required().error(new Error('Le champ dimanche matin est obligatoire')),
        apresMidi: Joi.array().required().error(new Error('Le champ dimanche après-midi est obligatoire')),
      }),
    }
  ),
  itinerant: Joi.boolean().required().error(new Error('Le champ accompagnements en itinérance est obligatoire')),
  updateAt: Joi.date().required().error(new Error('La date de mise à jour doit être présente')),
}).validate(createHorairesAdresseSchema);

module.exports = {
  createHorairesAdresseToSchema,
  validateCreateHorairesAdresseSchema,
};
