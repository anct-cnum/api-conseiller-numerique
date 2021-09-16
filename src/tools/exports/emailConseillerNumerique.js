#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('users').find({ roles: 'conseiller', passwordCreated: true }).toArray();

  let promises = [];

  logger.info(`${conseillers.length} conseillers qui ont crée leurs email @conseiller-numerique.fr`);
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'email_conseiller_numerique.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Nom; Prenom; Email conseiller-numerique.fr; Structure associée; SIRET\n');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const infoConseiller = await db.collection('conseillers').findOne({ _id: conseiller?.entity?.oid });
      const structure = await db.collection('structures').findOne({ _id: infoConseiller?.structureId });
      // eslint-disable-next-line max-len
      file.write(`${infoConseiller?.nom ?? 'Non renseigné'};${infoConseiller?.prenom ?? 'Non renseigné'};${conseiller?.name ?? 'Non renseigné'};${structure?.nom ?? 'Non renseigné'};${structure?.siret ?? 'Non renseigné'}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
