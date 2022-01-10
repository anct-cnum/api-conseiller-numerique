#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const users = await db.collection('users').find({ roles: { $in: ['conseiller'] } }).toArray();
  let promises = [];
  let countSansStautRecrutee = 0;
  let countOk = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'cnfs_sans_satut_recrutee.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('email du conseiller (collection users);idPG du conseiller\n');
  users.forEach(user => {
    promises.push(new Promise(async resolve => {
      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      if (!conseiller?.statut) {
        file.write(`${user?.name};${conseiller?.idPG}\n`);
        countSansStautRecrutee++;
      } else {
        countOk++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${countSansStautRecrutee} conseiller(s) recrutée mais qui n'ont pas de statut RECRUTEE et ${countOk} conseillers sont OK`);
  file.close();
});
