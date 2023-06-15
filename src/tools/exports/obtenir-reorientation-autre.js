#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const cli = require('commander');
const { lieuxReorientation } = require('../../../data/imports/LieuxRedirection.json');
const { execute } = require('../utils');

cli.description('Export reorientation autre')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  let query = [
    { $unwind: '$cra.organismes' },
    { $match: { 'cra.organismes': { '$ne': null } } },
    { $addFields: { 'organismeTab': { $objectToArray: '$cra.organismes' } } },
    { $unwind: '$organismeTab' },
    { $group: { '_id': '$organismeTab.k', 'count': { '$sum': '$organismeTab.v' } } },
    { $project: { '_id': 1, 'count': 1 } }
  ];

  let count = 0;
  try {
    const cras = await db.collection('cras').aggregate(query).toArray();
    if (cras) {
      logger.info(`Génération du fichier CSV...`);

      let csvFile = path.join(__dirname, '../../../data/exports', `reorientation_autre.csv`);

      let file = fs.createWriteStream(csvFile, {
        flags: 'w'
      });

      file.write('Nom de la réorientation; nombre\n');

      cras.forEach(cra => {
        if (!lieuxReorientation.includes(String(cra._id))) {
          file.write(`${cra?._id};${cra?.count};\n`);
          count++;
        }
      });

      logger.info(`${count} réorientations exportées`);
      file.close();
    }
  } catch (error) {
    console.log(error);
  }

});
