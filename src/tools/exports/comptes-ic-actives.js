#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const ObjectID = require('mongodb').ObjectID;

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const users = await db.collection('users').find({ sub: { $exists: true } }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'comptes_ic_actives.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('email,idPG SA,nom SA\n');
  users.forEach(user => {
    promises.push(new Promise(async resolve => {
      if (user.entity && user.entity.namespace === 'structures' && user.entity.oid) {
        const structure = await db.collection('structures').findOne({ _id: new ObjectID(user.entity.oid) });
        if (structure) {
          file.write(`${user.name},${structure.idPG},${structure.nom}\n`);
        } else {
          console.log(`idPG missing ${user.name}`);
        }
      } else {
        console.log(`no structures entity:${user.name}`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
