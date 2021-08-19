#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseiller = await db.collection('users').find({ roles: 'conseiller' }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);

  logger.info(`Il y a en tout ${conseiller.length} compte coop créer`);
  let csvFile = path.join(__dirname, '../../../data/exports', `liste_invite_coop.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Email_Coop;Email personelle du conseiller;Email de la structure\n');
  conseiller.forEach(infoUser => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(infoUser.entity.oid) });
      let structure = await db.collection('structures').findOne({ _id: conseiller?.structureId });
      // eslint-disable-next-line max-len
      file.write(`${!infoUser?.name ? 'Non renseigné' : infoUser.name};${!conseiller?.email ? 'Non renseigné' : conseiller.email};${!structure?.contact?.email ? `${structure?.nom} n'a pas renseigné d'email de contact` : structure?.contact?.email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
  logger.info(`CSV file...OK`);
});
