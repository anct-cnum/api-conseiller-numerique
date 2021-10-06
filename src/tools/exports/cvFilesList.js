#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ cv: { $exists: true } }).toArray();

  let promises = [];

  logger.info(`${conseillers.length} conseillers avec CV`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'listeCVs.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('CV\n');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      file.write(`${conseiller.cv.file}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
