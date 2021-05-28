#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  logger.info('Modification de la disponibilité du candidat sur PG ...');


  const updateConseillerPG = async (id, disponible) => {
    try {
      const row = await pool.query(`
        UPDATE djapp_coach
        SET disponible = $2
        WHERE id = $1`,
      [id, disponible]);
      return row;
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const date = new Date(Date.now() - 86400000).toISOString();
  let promises = [];
  await db.collection('sondages').find(
    { 'createdAt': { $gte: new Date(date) } },
    { 'conseiller.$id': 1, 'sondage.disponible': 1 }).forEach(function(sondage) {
    console.log(sondage);
    promises.push(new Promise(async resolve => {
      try {
        const conseiller = await db.collection('conseillers').findOne({ '_id': sondage.conseiller.oid });
        await updateConseillerPG(conseiller.idPG, sondage.sondage.disponible === 'Oui');
      } catch (error) {
        Sentry.captureException(error);
      }
      resolve();
    }));
  });

  exit();

});
