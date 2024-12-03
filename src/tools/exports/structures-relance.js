#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {

  let count = 0;

  const structures = await db.collection('structures').aggregate([
    {
      $unwind: '$coselec'
    },
    {
      $match: {
        'userCreated': true,
        'coselec.avisCoselec': 'POSITIF',
        '$or': [
          { 'coselec.numero': 'COSELEC 1' },
          { 'coselec.numero': 'COSELEC 2' }
        ]
      }
    },
    {
      $group: {
        _id: '$contact.email'
      }
    }
  ]).toArray();
  let promises = [];
  logger.info(`Generating CSV file...`);

  let csvFile = path.join(__dirname, '../../../data/exports', `structures_relance.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Email\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      try {
        file.write(`${structure._id}\n`);
      } catch (e) {
        logger.error(`Une erreur est survenue sur la structure contact.email=${structure._id}`);
      }
      count++;
      resolve();
    }));
  });
  promises.push(new Promise(async resolve => {
    file.close(function() {
      resolve();
    });
  }));
  await Promise.all(promises);
  logger.info(`${count} structures exported`);
  file.close();
});
