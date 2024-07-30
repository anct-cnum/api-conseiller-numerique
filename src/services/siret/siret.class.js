const Joi = require('joi');
const { NotFound, BadRequest } = require('@feathersjs/errors');
const { getEtablissementBySiretEntrepriseApiV3, getEntrepriseBySirenEntrepriseApiV3 } = require('../../utils/entreprise.api.gouv');

exports.Siret = class Siret {
  constructor(options, app) {
    this.options = options || {};
    this.app = app;
  }

  async get(siret) {
    const parameters = Joi.object({
      siret: Joi.string().alphanum().min(3).max(14).required(),
    }, { abortEarly: false }).validate({ siret });

    if (parameters.error) {
      return new BadRequest('Invalid parameters');
    }

    let result;
    try {
      result = await getEtablissementBySiretEntrepriseApiV3(parameters.value.siret, this.app.get('api_entreprise'));
    } catch (e) {
      return new NotFound('SIRET not found');
    }
    try {
      const resultsSiren = await getEntrepriseBySirenEntrepriseApiV3(parameters.value.siret.substring(0, 9), this.app.get('api_entreprise'));
      return {
        raison_sociale: resultsSiren?.unite_legale?.personne_morale_attributs?.raison_sociale,
        code_postal: result.adresse.code_postal,
      };
    } catch (err) {
      return new NotFound('SIRET not found');
    }
  }
};
