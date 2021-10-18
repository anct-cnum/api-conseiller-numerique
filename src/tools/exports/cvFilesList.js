#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ cv: { $exists: true } }).sort({ 'cv.file': 1 }).toArray();

  // Conserver uniquement la liste des CVs et sans doublon
  let cvFiles = conseillers.map(conseiller => conseiller.cv.file);
  cvFiles = [...new Set(cvFiles)];

  let promises = [];

  logger.info(`${conseillers.length} conseillers avec CV`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'listeCVs.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Liste des CVs\n');
  cvFiles.forEach(cv => {
    promises.push(new Promise(async resolve => {
      file.write(`${cv}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
