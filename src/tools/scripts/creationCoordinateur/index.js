#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const CSVToJSON = require('csvtojson');

const path = require('path');
const fs = require('fs');
const { program } = require('commander');

const updateUserConseiller = db => async conseillerId => {
  await db.collection('users').updateMany(
    { 'entity.$id': conseillerId },
    { $set: { 'roles': ['conseiller', 'coordinateur_coop'] } }
  );
};

// CSV importé
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const lines = await CSVToJSON().fromFile(filePath);
    return lines;
  } catch (err) {
    throw err;
  }
};

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Création du rôle coordinateur_coop pour les conseillers du fichier d\'import...');
  let nbCordinateurs = 0;

  // CSV exporté
  let promises = [];
  /*let csvFile = path.join(__dirname, '../../../data/exports', 'slugify_sur_ressourcerie.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
 */
  try {
    await readCSV(program.csv).then(async ressources => {
      ressources.forEach(ressource => {
        promises.push(new Promise(async resolve => {
          console.log(ressource);
          resolve();
        }));
      });
    });
  } catch (error) {
    logger.error(error);
  }

/*
await Promise.all(promises);
file.close();
  try {
    let promises = [];

    await Promise.all(promises);
    await logger.info(nbCordinateurs + ' coordinateur ont été créés.');
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }*/

  await logger.info('Fin de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
  exit();
});
