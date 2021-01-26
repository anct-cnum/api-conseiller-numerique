const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const axios = require('axios');
const configuration = require('config');
require('dotenv').config();

module.exports = ({ logger }) => {

  const router = express.Router(); // eslint-disable-line new-cap

	const params = {
		token: process.env.API_ENTREPRISE_KEY,
		context: 'cnum',
		recipient: 'cnum',
		object: 'checkSiret',
	};

	router.options('*', cors()) // OPTIONS pre-flight

	const corsOptions = {
    origin: configuration.cors.whitelist,
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	}

  router.get('/siret/:siret', cors(corsOptions), async (req, res) => {
    const parameters = Joi.object({
      siret: Joi.string().alphanum().min(3).max(14).required(),
    }, { abortEarly: false }).validate(req.params);

    if (parameters.error) {
      res.status(401).send({ error: parameters.error });
      return;
    }

		const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${parameters.value.siret}`;
		const urlSiren = `https://entreprise.api.gouv.fr/v2/entreprises/${parameters.value.siret.substring(0, 9)}`;

    axios.get(urlSiret, { params: params })
    .then(results => {
      const result = results.data.etablissement;

			axios.get(urlSiren, { params: params })
				.then( resultsSiren => {
					res.status(200).send({
						raison_sociale: resultsSiren.data.entreprise.raison_sociale,
						code_postal: result.adresse.code_postal,
					});
          return;
				});
    })
			.catch( err => {
				logger.error(err.message);
        res.status(404).send({ error: 'SIRET not found' });
			})
  });

  return router;
};
