#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(async ({ logger, db }) => {

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
        _id: '$contactEmail'
      }
    }
  ]).toArray();
  let promises = [];
  logger.info(`Generating CSV file...`);

  let csvFile = path.join(__dirname, '../../../data/exports', `structures_relance.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('Email\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      try {
        file.write(`${structure._id}\n`);
      } catch (e) {
        logger.error(`Une erreur est survenue sur la structure contactEmail=${structure._id}`);
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
