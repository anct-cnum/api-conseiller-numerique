const Joi = require('joi');

const validatePlaceSchema = geocodeInput => Joi.object({
  place: Joi.string().required().error(new Error('Le lieu à géolocaliser est invalide')),
}).validate(geocodeInput);

module.exports = {
  validatePlaceSchema,
};
