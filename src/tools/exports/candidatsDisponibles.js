#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const users = await db.collection('users').find({ roles: { $in: ['candidat'] } }).toArray();
  let promises = [];
  let countSansStatutRecrute = 0;
  let countOk = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'candidats_disponibles.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('email;idPG;nom;prenom;emailConfirmationKey\n');
  users.forEach(user => {
    promises.push(new Promise(async resolve => {
      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      if (conseiller?.statut !== 'RECRUTE' && conseiller?.disponible === true) {
        file.write(`${user?.name};${conseiller?.idPG};${conseiller?.nom};${conseiller?.prenom};${conseiller?.emailConfirmationKey}\n`);
        countSansStatutRecrute++;
      } else {
        countOk++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${countSansStatutRecrute} candidats disponibles et non recrutés et ${countOk} conseillers recrutés ou non disponibles.`);
  file.close();
});
