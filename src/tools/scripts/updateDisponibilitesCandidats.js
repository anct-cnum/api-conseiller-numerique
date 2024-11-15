#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { Pool } = require('pg');
const CSVToJSON = require('csvtojson');
const pool = new Pool();
const { program } = require('commander');

program.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    const candidats = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return candidats;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ db, logger, Sentry, exit }) => {
  const options = program.opts();
  const updateConseillerPG = async (email, disponible) => {
    try {
      const row = await pool.query(`
        UPDATE djapp_coach
        SET disponible = $2
        WHERE LOWER(email) = LOWER($1)`,
      [email, disponible]);
      return row;
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  logger.info('Mise à jour des candidats non disponibles');

  let count = 0;
  let errors = 0;

  await new Promise(() => {
    readCSV(options.csv).then(async candidats => {
      await new Promise(async () => {
        for (const candidat of candidats) {
          try {
            // PG en premier, attention synchro
            await updateConseillerPG(candidat.email, false);
            await db.collection('conseillers').updateMany({ email: candidat.email }, { $set: { disponible: false } });
            await db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': candidat.email }, {
              $set: {
                'conseillerObj.disponible': false
              }
            }, {});
            await db.collection('misesEnRelation').updateMany(
              {
                'conseillerObj.email': candidat.email,
                'statut': 'nouvelle'
              },
              {
                $set:
                {
                  'statut': 'non_disponible'
                }
              });
            count++;
          } catch (error) {
            logger.error(error);
            Sentry.captureException(error);
            errors++;
            return;
          }
        }

        if (count + errors === candidats.length) {
          logger.info(`${count} candidats mis à jour et ${errors} candidats en erreur`);
          exit();
        }
      });
    }).catch(error => {
      logger.error(error);
      exit();
    });
  });

  exit();
});
