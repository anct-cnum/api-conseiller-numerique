#!/usr/bin/env node
'use strict';

require('dotenv').config();

const slugify = require('slugify');
const CSVToJSON = require('csvtojson');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

const { execute } = require('../../utils');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

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

execute(__filename, async ({ logger, exit }) => {

  logger.info('Passage du slugify sur les noms de dossier et de pdf');

  // CSV exporté
  let promises = [];
  let csvFile = path.join(__dirname, '../../../../data/exports', 'slugify_sur_ressourcerie.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  try {
    await readCSV(program.csv).then(async ressources => {
      ressources.forEach(ressource => {
        promises.push(new Promise(async resolve => {
          const ressourceSlugifed = `${slugify(ressource.nom)}\n`;
          file.write(ressourceSlugifed);
          resolve();
        }));
      });
    });
  } catch (error) {
    logger.error(error);
  }

  await Promise.all(promises);
  file.close();

  logger.info('Csv généré dans api-conseiller-numerique/data/exports');
  exit();
});
