#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const miseEnrelations = await db.collection('misesEnRelation').find({ 'structureObj._id': new ObjectID('xxx') }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'candidats_custom.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('prenom;nom;email\n');
  miseEnrelations.forEach(miseEnrelation => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
      file.write(`${conseiller.prenom};${conseiller.nom};${conseiller.email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
