#!/usr/bin/env node
'use strict';
const { execute } = require('../utils');
const { program } = require('commander');
const { getEtablissementBySiretEntrepriseApiV3 } = require('../../utils/entreprise.api.gouv');

program.parse(process.argv);

execute(__filename, async ({ db, app, logger }) => {
  const store = async (s, insee) => {
    const filter = {
      '_id': s._id,
    };

    const updateDoc = {
      $set: {
        insee
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

    try {
      const resultBySiret = await getEtablissementBySiretEntrepriseApiV3(siret, app.get('api_entreprise'));
      return resultBySiret;
    } catch (e) {
      logger.info(e);
      throw new Error('SIRET not found');
    }
  };

  // Chercher les structures dont on n'a pas encore les infos de l'INSEE
  const match = await db.collection('structures').find({
    siret: { $ne: null },
    insee: { '$exists': false }
  });

  let s;
  while ((s = await match.next())) {
    try {
      let insee = await getINSEE(s.siret);
      if (insee !== undefined && insee !== null) {
        await store(s, insee);
      }
    } catch (e) {
      logger.info(e);
      logger.info(
        `insee,KO,${s._id},${s.idPG},${s.nom},${s.siret},`
      );
    }
  }
});
