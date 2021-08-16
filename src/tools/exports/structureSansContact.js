#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const stuctureContactNull = await db.collection('structures').find({ 'contact': null }).toArray();

  let promises = [];

  logger.info(`${stuctureContactNull.length} structure sont sans donnée de contact`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'structure_sans_contact.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('idPG; SIRET;Nom de la structure\n');
  stuctureContactNull.forEach(info => {
    promises.push(new Promise(async resolve => {
      let structure = await db.collection('structures').findOne({_id: info._id});
      // eslint-disable-next-line max-len
      file.write(`${structure.idPG};${structure.siret};${structure.nom}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
