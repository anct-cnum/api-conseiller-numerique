#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('users').find({ passwordCreated: false, roles: { $elemMatch: { $eq: 'conseiller' } } }).toArray();
  const conseillersTotal = await db.collection('users').countDocuments({ passwordCreated: false, roles: { $elemMatch: { $eq: 'conseiller' } } });
  let promises = [];

  logger.info(`Il y a en tout ${conseillersTotal} qui n'ont pas créer leurs compte`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'conseillers_compte_non_creer.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('prenom;nom;date d\'envoi de l\'invitation l\'email;téléphone\n');
  conseillers.forEach(user => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ nom: user.nom, prenom: user.prenom });
      // eslint-disable-next-line max-len
      file.write(`${conseiller.prenom};${conseiller.nom};${user.mailSentDate};${conseiller.telephone}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
