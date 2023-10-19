#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');
const utils = require('../../utils/index.js');

// node src/tools/exports/structures-sans-convention.js


execute(__filename, async ({ logger, db }) => {
  const structures = await db.collection('structures').find({
    statut: 'VALIDATION_COSELEC',
    conventionnement: null
  }).toArray();

  let promises = [];

  logger.info(`${structures.length} structures VALIDATION_COSELEC sans Convention`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'structures_sans_convention.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  logger.info(`Generating CSV file...`);
  file.write('idStructure;Nom de la structure;Siret;Numero DS phase 1;\n');
  structures.forEach(s => {
    promises.push(new Promise(async resolve => {
      const coselec = utils.getCoselec(s);
      if (!coselec?.nombreConseillersCoselec) {
        logger.error(`La structure ${s.idPG} ne comporte pas de nombre de poste !`);
      }
      if (coselec?.nombreConseillersCoselec >= 1) {
        file.write(`${s.idPG};${s.nom};${s.siret};;\n`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
