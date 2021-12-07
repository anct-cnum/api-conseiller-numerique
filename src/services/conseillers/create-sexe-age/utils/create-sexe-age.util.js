const Joi = require("joi");
const {NotFound} = require("@feathersjs/errors");
const Sexe = {
  Autre: 'Autre',
  Femme: 'Femme',
  Homme: 'Homme'
};

const createSexeAgeBodyToSchema = body => ({
  sexe: body.sexe,
  dateDeNaissance: new Date(body.dateDeNaissance),
});

const validateCreateSexeAgeSchema = createSexeAgeSchema => Joi.object({
  sexe: Joi.string().required().error(new Error('Le champ sexe est obligatoire')),
  dateDeNaissance: Joi.date().required().error(new Error('Le champ date de naissance est obligatoire'))
}).validate(createSexeAgeSchema);

const conseillerGuard = async (conseillerId, countConseillersDoubles) =>
  countConseillersDoubles(conseillerId) === 0 ?
    Promise.reject(new NotFound('Ce compte n\'existe pas ! Vous allez être déconnecté.')) :
    Promise.resolve();

module.exports = {
  Sexe,
  createSexeAgeBodyToSchema,
  validateCreateSexeAgeSchema,
  conseillerGuard
};
