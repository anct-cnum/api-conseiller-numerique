#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ cv: { $exists: true } }).sort({ 'cv.file': 1 }).stream();

  const generateCsv = async cvFiles => {
    let promises = [];

    logger.info(`${cvFiles.length} conseillers avec CV`);
    logger.info(`[Début] Génération du csv liste des CVs`);
    let csvFile = path.join(__dirname, '../../../data/exports', 'listeCVs.csv');

    let file = fs.createWriteStream(csvFile, {
      flags: 'w'
    });

    file.write('CV\n');
    cvFiles.forEach(cv => {
      promises.push(new Promise(async resolve => {
        file.write(`${cv}\n`);
        resolve();
      }));
    });
    await Promise.all(promises);
    file.close();
    logger.info(`[Fin] Génération du csv liste des CVs`);
  };

  // Conservation de la liste des fichiers CVs uniquement
  let cvFiles = [];
  conseillers.on('data', conseiller => {
    cvFiles.push(conseiller.cv.file);
  });

  conseillers.on('end', () => {
    cvFiles = [...new Set(cvFiles)]; //sans doublon
    generateCsv(cvFiles);
  });
});
