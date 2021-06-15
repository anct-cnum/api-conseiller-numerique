#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const axios = require('axios');
const { Pool } = require('pg');
const { execute } = require('../../../utils');

const pool = new Pool();

execute(__filename, async ({ logger, exit }) => {

  const getMissing = async () => {
    try {
      const { rows } = await pool.query('SELECT * FROM djapp_hostorganization WHERE departement_code = \'\' ORDER BY id ASC');
      if (rows.length > 0) {
        logger.info(`Nombre : ${rows.length}`);
        return rows;
      } else {
        logger.info(`Aucune manquante`);
      }
    } catch (error) {
      logger.error(`Erreur DB : ${error.message}`);
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
    } catch (e) {
      throw new Error(`API Error : ${e}`);
    }
  };

  const storeGeo = async (s, geo) => {
    try {
      await pool.query('UPDATE djapp_hostorganization SET commune_code=$2, departement_code=$3, region_code=$4, geo_name=$5 WHERE id=$1',
        [s.id, geo.code, geo.codeDepartement, geo.codeRegion, geo.nom]);
    } catch (error) {
      logger.error(`Erreur DB : ${error.message}`);
    }
  };

  logger.info('Recherche des structures sans département...');

  let count = 0;

  const structures = await getMissing();

  for (const s of structures) {
    const geo = await getGeo(s.zip_code);

    if (geo.length === 0) {
      logger.info(`Aucun résultat pour ${s.zip_code}`);
    } else if (geo.length === 1) {
      await storeGeo(s, geo[0]);
      count++;
      logger.info(`${geo[0].nom}`);
    } else {
      // Plusieurs ville pour ce code postal
      // On ne stocke pas le nom de la ville
      // Seuls les codes région et département sont bons
      const ville = geo[0];
      ville.code = '';
      ville.nom = '';
      await storeGeo(s, ville);
      count++;
      logger.info(`${ville.codeDepartement}`);
    }
  }

  logger.info(`${count} structures mises à jour`);

  exit();
});
