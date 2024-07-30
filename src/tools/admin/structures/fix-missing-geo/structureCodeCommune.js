#!/usr/bin/env node
'use strict';

require('dotenv').config();

// node src/tools/admin/structures/fix-missing-geo/structureCodeCommune.js

const axios = require('axios');
const { Pool } = require('pg');
const { execute } = require('../../../utils');

const pool = new Pool();

execute(__filename, async ({ db, logger, exit }) => {

  const getMissing = async () => {
    try {
      const { rows } = await pool.query('SELECT * FROM djapp_hostorganization WHERE commune_code = \'\' ORDER BY id ASC');
      if (rows.length > 0) {
        logger.info(`Nombre : ${rows.length}`);
        return rows;
      } else {
        logger.info(`Aucune manquante`);
      }
    } catch (error) {
      logger.error(error);
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
      logger.error(error);
    }
  };
  const getStructure = db => async id => await db.collection('structures').findOne({ idPG: id });

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
      logger.info(`Partie 1 : Correction Ok pour la structure ${s.id} :${geo[0].nom}`);
    } else {
      let ville = geo[0];
      const structure = await getStructure(db)(s.id);
      if (structure?.insee?.adresse?.code_postal === s.zip_code) {
        const getCommune = geo.find(g => g?.code === structure?.insee?.adresse?.code_commune);
        ville = getCommune;
        await storeGeo(s, ville);
        logger.info(`Partie 2 : Correction Ok pour la structure ${s.id} :${geo[0].nom}`);
        count++;
      } else {
        logger.warn(`La structure ${s.id} à corriger avec le code postal ${s.zip_code} (statut: ${structure?.statut})`);
      }
    }
  }

  logger.info(`${count} / ${structures?.length} structures mises à jour`);

  exit();
});
