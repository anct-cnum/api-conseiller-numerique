#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const { execute } = require('../utils');

require('dotenv').config();

program
.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const conseillers = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return conseillers;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ logger, db, Sentry }) => {
  let promises = [];
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, 'cnfs_email_pro_import.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  // eslint-disable-next-line max-len
  file.write('ID CNFS;Id ou email CNFS;Prénom;Nom;Raison sociale;Commune;Département;Date de fin de formation;Lot;Parcours;Palier PIX;ID structure;Type de structure;email Pro\n');
  await new Promise(resolve => {
    readCSV(program.csv).then(async conseillers => {
      conseillers.forEach(conseiller => {
        promises.push(new Promise(async resolve => {
          const conseillerId = parseInt(conseiller['ID CNFS']);
          const cnfs = await db.collection('conseillers').findOne({ idPG: conseillerId });
          // eslint-disable-next-line max-len
          file.write(`${conseillerId};${conseiller['Id ou email CNFS']};${conseiller['Prénom']};${conseiller['Nom']};${conseiller['Raison sociale']};${conseiller['Commune']};${conseiller['Département']};${conseiller['Date de fin de formation']};${conseiller['Lot']};${conseiller['Parcours']};${conseiller['Palier PIX']};${conseiller['ID structure']};${conseiller['Type de structure']};${cnfs?.emailCN?.address ?? 'COOP non activé'}\n`);
          resolve();
        }));
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
  file.close();
});
