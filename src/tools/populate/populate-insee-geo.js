#!/usr/bin/env node
'use strict';
const axios = require('axios');
const { execute } = require('../utils');
const { program } = require('commander');

program.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {
  const store = async (s, adresse) => {
    const filter = {
      '_id': s._id,
    };

    const updateDoc = {
      $set: {
        coordonneesInsee: adresse.features[0].geometry,
        adresseInsee2Ban: adresse.features[0].properties,
      }
    };

    const options = { };

    const result = await db.collection('structures').updateOne(filter, updateDoc, options);

    logger.info(
      `geo,OK,${s._id},${s.idPG},${s.nom},${s.siret},` +
      `${result.matchedCount},${result.modifiedCount}`
    );
  };

  const getGeo = async adresse => {
    const adressePostale = encodeURI(`${adresse.numero_voie === null ? '' : adresse.numero_voie} ` +
      `${adresse.type_voie === null ? '' : adresse.type_voie} ${adresse.nom_voie}`);
    const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adressePostale}&citycode=${adresse.code_insee_localite}`;

    const params = {};

    try {
      const result = await axios.get(urlAPI, { params: params });
      return result.data;
    } catch (e) {
      throw new Error(`API Error : ${e} ${urlAPI}`);
    }
  };

  const match = await db.collection('structures').find({
    siret: { $ne: null },
    insee: { '$exists': true }
  });

  let s;
  while ((s = await match.next())) {
    if (!s.insee || !s.insee.etablissement || !s.insee.etablissement.adresse) {
      logger.info(`geo,KOINSEE,${s._id},${s.idPG},${s.nom},${s.siret},`);
      continue;
    }

    try {
      let adresse = await getGeo(s.insee.etablissement.adresse);
      await store(s, adresse);
    } catch (e) {
      logger.error(`geo,KOAPI,${s._id},${s.idPG},${s.nom},${s.siret},${e.message}`);
    }
  }

  exit();
});
