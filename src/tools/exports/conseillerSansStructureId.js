#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('users').find({ roles: 'conseiller' }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', `conseiller_sans_structureId.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('idPG;Nom;Prenom;Email;StructureId;Statut\n');
  conseillers.forEach(infoUser => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: infoUser.entity.oid });
      // eslint-disable-next-line max-len
      if (!conseiller.structureId) {
        file.write(`${conseiller.idPG};${conseiller.nom};${conseiller.prenom};${conseiller.email};${conseiller.structureId};${conseiller.statut}\n`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
  logger.info(`CSV file...OK`);
});
