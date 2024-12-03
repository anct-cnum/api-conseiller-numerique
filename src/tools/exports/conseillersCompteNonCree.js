#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('users').find({ passwordCreated: false, roles: { $elemMatch: { $eq: 'conseiller' } } }).toArray();
  const conseillersTotal = await db.collection('users').countDocuments({ passwordCreated: false, roles: { $elemMatch: { $eq: 'conseiller' } } });
  let promises = [];

  logger.info(`${conseillersTotal} conseillers n'ont pas créés leur compte`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'conseillers_compte_non_cree.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('prenom;nom;date d\'envoi de l\'invitation;email;téléphone\n');
  conseillers.forEach(user => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ nom: user.nom, prenom: user.prenom });
      file.write(`${conseiller.prenom};${conseiller.nom};${moment(user.mailSentDate).format('DD/MM/yyyy')};${conseiller.email};${conseiller.telephone}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
