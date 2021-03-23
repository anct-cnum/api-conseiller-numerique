#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const { execute } = require('../utils');

execute(async ({ logger, db }) => {
  const structures = await db.collection('structures').find().toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'structures.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      const matchings = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': new ObjectID(structure._id) });
      const user = await db.collection('users').findOne({ 'entity.$id': new ObjectID(structure._id) });
      file.write(`${structure.siret};${structure.idPG};${structure.nom};${structure.type};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure.contactTelephone};${structure.contactEmail};${structure.userCreated ? 'oui' : 'non'};${user !== null && user.passwordCreated ? 'oui' : 'non'};${matchings}\n`);
      resolve();
    }));
  });

  await Promise.all(promises);
  file.close();
});
