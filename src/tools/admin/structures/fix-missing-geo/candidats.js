#!/usr/bin/env node
'use strict';

require('dotenv').config();

const axios = require('axios');
const { Pool } = require('pg');
const { execute } = require('../../../utils');

const pool = new Pool();

execute(__filename, async ({ logger, exit, Sentry }) => {

  const getMissing = async () => {
    try {
      const { rows } = await pool.query('SELECT * FROM djapp_coach WHERE departement_code = \'\' ORDER BY id ASC');
      if (rows.length > 0) {
        logger.info(`Nombre : ${rows.length}`);
        return rows;
      } else {
        logger.info(`Aucun code departement manquant pour les candidats`);
      }
    } catch (error) {
      logger.error(error.message);
      Sentry.captureException(error);
    }
  };

  const getGeo = async codePostal => {
    if (!/^\d{5}$/.test(codePostal)) {
      logger.info(`Code postal invalide : ${codePostal}`);
      return;
    }

    const urlAPI = `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=nom,code,codesPostaux,centre,population,codeDepartement,codeRegion`;

    const params = {};

    try {
      const result = await axios.get(urlAPI, { params: params });
      return result.data;
    } catch (error) {
      logger.error(error.message);
      Sentry.captureException(error);
    }
  };

  const storeGeo = async (c, geo) => {
    try {
      await pool.query('UPDATE djapp_coach SET commune_code=$2, departement_code=$3, region_code=$4, geo_name=$5 WHERE id=$1',
        [c.id, geo.code, geo.codeDepartement, geo.codeRegion, geo.nom]);
      logger.info(`UPDATE PG ${c.id}, ${geo.code}, ${geo.codeDepartement}, ${geo.codeRegion}, ${geo.nom}`);
    } catch (error) {
      logger.error(error.message);
      Sentry.captureException(error);
    }
  };

  logger.info('Recherche des candidats sans département...');

  let count = 0;

  const candidats = await getMissing();

  for (const c of candidats) {
    const geo = await getGeo(c.zip_code);

    if (geo.length === 0) {
      logger.info(`Aucun résultat pour ${c.zip_code}`);
    } else if (geo.length === 1) {
      await storeGeo(c, geo[0]);
      count++;
      logger.info(`Nom de la commune ${geo[0].nom}`);
    } else {
      // Plusieurs ville pour ce code postal
      // On ne stocke pas le nom de la ville
      // Seuls les codes région et département sont bons
      const ville = geo[0];
      ville.code = '';
      ville.nom = '';
      await storeGeo(c, ville);
      count++;
      logger.info(`Code département ${ville.codeDepartement}`);
    }
  }

  logger.info(`${count} candidats mis à jour`);

  exit();
});
