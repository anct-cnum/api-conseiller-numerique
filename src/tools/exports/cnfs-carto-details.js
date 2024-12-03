#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');


execute(__filename, async ({ logger, db }) => {
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const cnfs = await db.collection('conseillers').aggregate([
    {
      $match: {
        statut: 'RECRUTE',
        nonAffichageCarto: { $ne: true },
      }
    },
    {
      $lookup: {
        localField: 'structureId',
        from: 'structures',
        foreignField: '_id',
        as: 'structure'
      }
    },
    { $unwind: '$structure' },
    {
      $project: {
        '_id': 0,
        'nom': 1,
        'prenom': 1,
        'emailPro': 1,
        'emailCN.address': 1,
        'structure.nom': 1,
        'structure.siret': 1,
        'structure.codePostal': 1,
        'structure.insee.adresse': 1
      }
    }
  ]).toArray();

  let promises = [];

  logger.info(`Génération du fichier csv...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'cnfs.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write('Nom; Prenom; Email pro; Email CnFS; Nom de la structure; SIRET; Code postal; Adresse insee\n');

  cnfs.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      let adresse = (conseiller.structure?.insee?.adresse?.numero_voie ?? '') + ' ' +
      (conseiller.structure?.insee?.adresse?.type_voie ?? '') + ' ' +
      (conseiller.structure?.insee?.adresse?.libelle_voie ?? '') + ' ' +
      (conseiller.structure?.insee?.adresse?.complement_adresse ? conseiller.structure.insee.adresse.complement_adresse + ' ' : '') +
      (conseiller.structure?.insee?.adresse?.code_postal ?? '') + ' ' +
      (conseiller.structure?.insee?.adresse?.libelle_commube ?? '');
      adresse = adresse.replace(/["',]/g, '');

      file.write(`${conseiller.nom};${conseiller.prenom};${conseiller.emailPro ?? 'Non renseigné'};${conseiller.emailCN.address};${conseiller.structure.nom.replace(/["',]/g, '')};${conseiller.structure.siret ?? 'non renseigné'};${conseiller.structure.codePostal};${adresse}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
