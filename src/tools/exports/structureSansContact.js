#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const structureWithoutContact = await db.collection('structures').find({ 'contact': null }).toArray();

  let promises = [];

  logger.info(`${structureWithoutContact.length} structure sont sans donnée de contact`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'structures_sans_contact.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('idPG; SIRET;Nom de la structure\n');
  structureWithoutContact.forEach(structure => {
    promises.push(new Promise(async resolve => {
      file.write(`${structure.idPG};${structure.siret};${structure.nom}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
