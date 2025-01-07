#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const CSVToJSON = require('csvtojson');
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
  logger.info('Mise à jour des candidats non disponibles');

  let count = 0;
  let errors = 0;

  await new Promise(() => {
    readCSV(options.csv).then(async candidats => {
      await new Promise(async () => {
        for (const candidat of candidats) {
          try {
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
