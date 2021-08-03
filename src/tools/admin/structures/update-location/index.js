#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const axios = require('axios');
const { Pool } = require('pg');
const { execute } = require('../../../utils');
const { program } = require('commander');

const pool = new Pool();

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  program.option('-i, --id <id>', 'id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  if (!program.id) {
    exit('id PG obligatoire');
    return;
  }

  const getStructure = async id => {
    try {
      const { rows } = await pool.query(`SELECT * FROM djapp_hostorganization WHERE id=$1`, [id]);
      if (rows.length > 0) {
        logger.info(`Nombre : ${rows.length}`);
        return rows;
      } else {
        logger.info(`Structure introuvable`);
      }
    } catch (error) {
      logger.error(`Erreur DB : ${error.message}`);
      Sentry.captureException(`Erreur DB : ${error.message}`);
    }
  };

  const getGeo = async codeCommune => {
    if (!/^\d{5}$/.test(codeCommune)) {
      logger.info(`Code commune invalide : ${codeCommune}`);
      return;
    }

    const urlAPI = `https://geo.api.gouv.fr/communes/${codeCommune}?format=geojson&geometry=centre`;
    const params = {};

    try {
      const result = await axios.get(urlAPI, { params: params });
      return result.data;
    } catch (e) {
      throw new Error(`API Error : ${e}`);
    }
  };

  const storeGeoPG = async (s, geo) => {
    try {
      await pool.query(`UPDATE djapp_hostorganization SET location = ST_GeomFromGeoJSON
            ($2) WHERE id=$1`,
      [s.id, geo.geometry]);
    } catch (error) {
      logger.error(`Erreur DB : ${error.message}`);
      Sentry.captureException(`Erreur DB : ${error.message}`);
    }
  };

  const storeGeo = async (s, geo) => {
    const filter = { idPG: s.id };

    const updateDoc = {
      $set: {
        location: geo.geometry,
      }
    };

    const options = {};

    const result = await db.collection('structures').updateOne(filter, updateDoc, options);

    logger.info(
      `structure,${s.id},${result.matchedCount},${result.modifiedCount}`
    );
  };

  logger.info('Recherche de la structure...');

  let count = 0;

  const structures = await getStructure(program.id);

  for (const s of structures) {
    const geo = await getGeo(s.commune_code);

    if (geo.length === 0) {
      logger.info(`Aucun résultat pour ${s.commune_code}`);
    } else {
      await storeGeoPG(s, geo);
      await storeGeo(s, geo);
      count++;
      logger.info(`${geo.properties.nom}`);
    }
  }

  logger.info(`${count} structures mises à jour`);

  exit();
});
