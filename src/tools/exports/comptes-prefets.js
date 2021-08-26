#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const departements = await db.collection('users').aggregate([
    { $match: { roles: { $elemMatch: { $eq: 'prefet' } } } }, { $group: { _id: '$departement' } }
  ]).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'comptes_prefets.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('departement\n');
  departements.forEach(departement => {
    promises.push(new Promise(async resolve => {
      file.write(`${departement._id}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
