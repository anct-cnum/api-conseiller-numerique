#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');
const utils = require('../../utils/index');

execute(__filename, async ({ logger, db }) => {
  const users = await db.collection('users').find({ roles: { $in: ['structure'] } }).toArray();
  let promises = [];
  let countInvalide = 0;
  let countOk = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'sa_nombre_de_poste.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('idPG de la structure;Email de la structure;Nombre de poste (dernier Coselec);Nombre personne validé/recrutee\n');
  users.forEach(user => {
    promises.push(new Promise(async resolve => {
      const structure = await db.collection('structures').findOne({ _id: user.entity.oid });
      const dernierCoselec = utils.getCoselec(structure);
      const nombreMiseEnRelation = await db.collection('misesEnRelation').countDocuments({
        'structure.$id': user.entity.oid,
        'statut': { $in: ['recrutee', 'finalisee']
        } }
      );
      if (nombreMiseEnRelation > dernierCoselec.nombreConseillersCoselec) {
        file.write(`${structure.idPG};${user.name}; ${dernierCoselec.nombreConseillersCoselec};${nombreMiseEnRelation}\n`);
        countInvalide++;
      } else {
        countOk++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${countInvalide} ont dépassé le quota de postes attribués et ${countOk} structures sont OK`);
  file.close();
});
