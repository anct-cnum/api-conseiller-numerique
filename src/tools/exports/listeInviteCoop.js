#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('users').find({ roles: 'conseiller' }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);

  logger.info(`${conseillers.length} comptes coop créés`);
  let csvFile = path.join(__dirname, '../../../data/exports', `liste_emails_coop.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Email CN;Email personelle du conseiller;Email de la structure\n');
  conseillers.forEach(infoUser => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: infoUser.entity.oid });
      let structure = await db.collection('structures').findOne({ _id: conseiller?.structureId });
      // eslint-disable-next-line max-len
      file.write(`${infoUser?.name ?? 'Non renseigné'};${conseiller?.email ?? 'Non renseigné'};${structure?.contact?.email ?? `${structure?.nom} n'a pas renseigné d'email de contact`}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
  logger.info(`CSV file...OK`);
});
