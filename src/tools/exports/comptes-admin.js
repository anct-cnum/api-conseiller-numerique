#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const users = await db.collection('users').find({ roles: { $elemMatch: { $eq: 'admin' } } }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'comptes_admin.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('email\n');
  users.forEach(user => {
    promises.push(new Promise(async resolve => {
      file.write(`${user.name}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
