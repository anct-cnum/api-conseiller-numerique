#!/usr/bin/env node
'use strict';
const axios = require('axios');
const { execute } = require('../utils');
const { program } = require('commander');

program.parse(process.argv);

execute(async ({ db, logger }) => {
  const store = async (s, insee) => {
    const filter = {
      '_id': s._id,
    };

    const updateDoc = {
      $set: {
        insee: insee
      }
    };

    const options = { };

    const result = await db.collection('structures').updateOne(filter, updateDoc, options);

    logger.info(
      `insee,OK,${s._id},${s.idPG},${s.nom},${s.siret},` +
      `${result.matchedCount},${result.modifiedCount}`
    );
  };

  const getINSEE = async siret => {
    if (!/^\d{14}$/.test(siret)) {
      return;
    }

    const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${siret}`;
    const urlSiren = `https://entreprise.api.gouv.fr/v2/entreprises/${siret.substring(0, 9)}`;

    const params = {
      token: process.env.API_ENTREPRISE_KEY,
      context: 'cnum',
      recipient: 'cnum',
      object: 'checkSiret',
    };

    try {
      const resultEtablissement = await axios.get(urlSiret, { params: params });
      const resultEntreprise = await axios.get(urlSiren, { params: params });

      return {
        entreprise: resultEntreprise.data.entreprise,
        etablissement: resultEtablissement.data.etablissement,
      };
    } catch (e) {
      throw new Error('SIRET not found');
    }
  };

  // Chercher les structures dont on n'a pas encore les infos de l'INSEE
  const match = await db.collection('structures').find({
    siret: { $ne: null },
    insee : { '$exists' : false }
  });

  let s;
  while ((s = await match.next())) {
    try {
      let insee = await getINSEE(s.siret);
      if (insee !== null) {
        await store(s, insee);
      }
    } catch (e) {
      logger.info(
        `insee,KO,${s._id},${s.idPG},${s.nom},${s.siret},`
      );
    }
  }
});
