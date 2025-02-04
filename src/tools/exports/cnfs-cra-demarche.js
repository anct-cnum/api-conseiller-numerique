#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillersids = await db.collection('cras').distinct('conseiller.$id', { 'cra.themes': { $in: ['demarche en ligne'] } });

  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'demarche-en-ligne-cnfs.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Nom;Prénom;mail du CNFS;Nombre de CRA;Nom Structure;SIRET;Adresse de la SA\n');
  conseillersids.forEach(id => {
    promises.push(new Promise(async resolve => {
      const conseiller = await db.collection('conseillers').findOne({ _id: id, statut: 'RECRUTE' });
      if (conseiller) {
        const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
        // eslint-disable-next-line camelcase
        const { numero_voie, type_voie, libelle_voie, complement_adresse, code_postal, libelle_commune } = structure?.insee?.adresse;
        const adresse =
        // eslint-disable-next-line camelcase
          `${numero_voie ?? ''} ${type_voie ?? ''} ${libelle_voie ?? ''} ${complement_adresse ?? ''} ${code_postal ?? ''} ${libelle_commune ?? ''}`;
        const craFiltre = await db.collection('cras').countDocuments({ 'conseiller.$id': id, 'cra.themes': { $in: ['demarche en ligne'] } });
        file.write(`${conseiller.nom};${conseiller.prenom};${conseiller?.emailCN?.address};${craFiltre};${structure.nom.replace(/["',]/g, '')};${structure.siret};${adresse.replace(/["',]/g, '')}\n`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
