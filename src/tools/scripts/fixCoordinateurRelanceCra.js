#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');

program.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const conseillers = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return conseillers;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Mise à jour des conseillers avec le rôle coordinateur');

  let count = 0;

  await new Promise(() => {
    readCSV(program.csv).then(async ressources => {
      await new Promise(async () => {
        for (const ressource of ressources) {
          await db.collection('conseillers').updateOne(
            {
              'emailCN.address': ressource.conseiller,
              'estCoordinateur': { $exists: false }
            },
            {
              $set: { estCoordinateur: true }
            });
          count++;
        }

        if (count === ressources.length) {
          logger.info(`${count} conseillers ont obtenu le flag coordinateur`);
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
