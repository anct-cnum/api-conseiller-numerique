#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../utils');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return structures;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('[Grand Réseau] Identification des structures grands réseaux');
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async structures => {
      const total = structures.length;
      let count = 0;
      let ok = 0;
      let errors = 0;
      if (total === 0) {
        logger.info(`[Grand Réseau] Aucune structure indiquée dans le fichier fourni`);
        exit();
      }

      structures.forEach(structure => {
        let p = new Promise(async (resolve, reject) => {
          const siret = structure['SIRET'].replace(/\s/g, '');
          const email = structure['MAIL'];
          const nomReseau = structure['RESEAU'];
          const nbStructures = await db.collection('structures').countDocuments({ siret, 'contact.email': email });

          if (nbStructures === 0) {
            logger.warn(`Aucune structure trouvée avec le siret '${siret}' et l'email '${email}'`);
            errors++;
            reject();
          } else {
            //Insertion du nom du reseau dans le doc structure (possibilité de doubons donc many)
            await db.collection('structures').updateMany(
              { siret, 'contact.email': email },
              {
                $set: {
                  'reseau': nomReseau
                }
              }, {});
            ok += nbStructures;
          }
          count++;
          if (total === count) {
            logger.info(`[Grand Réseau] Mise à niveau des structures :  ` +
                `${ok} structures identifiées grands reseaux / ${errors} erreurs`);
            exit();
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
  exit();
});
