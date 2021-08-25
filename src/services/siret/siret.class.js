const Joi = require('joi');
const axios = require('axios');
const app = require('../../app');
const { NotFound, BadRequest } = require('@feathersjs/errors');

/* eslint-disable no-unused-vars */
exports.Siret = class Siret {
  constructor(options) {
    this.options = options || {};
  }

  async get(siret, params) {
    const parameters = Joi.object({
      siret: Joi.string().alphanum().min(3).max(14).required(),
    }, { abortEarly: false }).validate({ siret });

    if (parameters.error) {
      return new BadRequest('Invalid parameters');
    }

    const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${parameters.value.siret}`;
    const urlSiren = `https://entreprise.api.gouv.fr/v2/entreprises/${parameters.value.siret.substring(0, 9)}`;


    params = {
      token: app.get('api_entreprise'),
      context: 'cnum',
      recipient: 'cnum',
      object: 'checkSiret',
    };

    let result;
    try {
      const results = await axios.get(urlSiret, { params: params });
      result = results.data.etablissement;

    } catch (e) {
      return new NotFound('SIRET not found');
    }
    try {
      const resultsSiren = await axios.get(urlSiren, { params: params });
      return {
        raison_sociale: resultsSiren.data.entreprise.raison_sociale,
        code_postal: result.adresse.code_postal,
      };
    } catch (err) {
      return new NotFound('SIRET not found');
    }
  }
};
