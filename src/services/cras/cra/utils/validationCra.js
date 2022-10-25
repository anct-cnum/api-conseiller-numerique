const Joi = require('joi');

const validationCra = ObjectCra => {
  const schema = Joi.object({
    codePostal: Joi.string().required().min(5).max(5).error(new Error('Le code postal est invalide')),
    nomCommune: Joi.string().required().error(new Error('Le nom de la commune est invalide')),
    canal: Joi.string().required().valid('rattachement', 'autre', 'distance', 'domicile').error(new Error('Le canal est invalide')),
    activite: Joi.string().required().valid('individuel', 'collectif', 'ponctuel').error(new Error('L\'activité est invalide')),
    nbParticipants: Joi.number().integer().required().min(1).max(100).error(new Error('Le nombre de participants est invalide')),
    nbParticipantsRecurrents: Joi.number().integer().required().allow(null).min(0).max(100).error(new Error('Le nombre de participants est invalide')),
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
    sousThemes: Joi.array().allow(null).error(new Error('Le sous thème est invalide')),
    duree: Joi.any().required().error(new Error('La durée est invalide')),
    accompagnement: Joi.object({
      individuel: Joi.number().integer().min(0).max(100).error(new Error('Le nombre d\'accompagnements poursuivis en individuel est invalide')),
      atelier: Joi.number().integer().min(0).max(100).error(new Error('Le nombre d\'accompagnements poursuivis en atelier est invalide')),
      // eslint-disable-next-line max-len
      redirection: Joi.number().integer().min(0).max(100).error(new Error('Le nombre d\'accompagnements redirigés vers un autre établissement est invalide')),
    }),
    dateAccompagnement: Joi.date().min(new Date('2020-01-01T00:00:00.000Z')).required().error(new Error('La date est invalide')),
    organisme: Joi.string().required().allow(null).error(new Error('L\'organisme de l\'accompagnement est invalide')),
  }).validate(ObjectCra.cra);

  return schema.error;
};

module.exports = {
  validationCra
};
