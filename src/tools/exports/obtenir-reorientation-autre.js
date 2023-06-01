#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const cli = require('commander');

const { execute } = require('../utils');

cli.description('Export reorientation autre')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  let query = [
    { $unwind: '$cra.organismes' },
    { $match: { 'cra.organismes': { '$ne': null } } },
    { $project: { '_id': 0, 'organismes': '$cra.organismes' } }
  ];
  let count = 0;
  let reorientations = [];
  let promises = [];
  const reorientationsExistantes = [
    'ANTS',
    'Assistante sociale',
    'CAF',
    'CARSAT',
    'CCAS',
    'CEFS',
    'CIP',
    'CPAM',
    'DGFIP',
    'France Services',
    'Mairie',
    'Médiathèque',
    'Mission locale',
    'Pôle emploi',
    'Préfecture',
    'Sous-préfecture',
    'Service de police',
    'Gendarmerie',
    'Revendeur informatique',
    'Tiers-lieu / Fablab'
  ];
  const cras = await db.collection('cras').aggregate(query).toArray();

  logger.info(`Génération du fichier CSV...`);

  let csvFile = path.join(__dirname, '../../../data/exports', `reorientation_autre.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write('Nom de la réorientation; nombre\n');

  cras.forEach(cra => {
    if (!reorientationsExistantes.includes(String(Object.keys(cra.organismes)[0]))) {
      promises.push(new Promise(async resolve => {
        if (reorientations.filter(reorientation => reorientation.nom === String(Object.keys(cra.organismes)[0]))?.length > 0) {
          reorientations.filter(reorientation => reorientation.nom === Object.keys(cra.organismes)[0])[0].valeur +=
          cra.organismes[Object.keys(cra.organismes)[0]];
        } else {
          reorientations.push({
            nom: String(Object.keys(cra.organismes)[0]),
            valeur: cra.organismes[Object.keys(cra.organismes)[0]]
          });
        }
        resolve();
      }));
    }
  });

  reorientations.forEach(reorientation => {
    file.write(`${reorientation?.nom};${reorientation?.valeur};\n`);
    count++;
  });
  await Promise.all(promises);
  logger.info(`${count} réorientations exportées`);
  file.close();
});
