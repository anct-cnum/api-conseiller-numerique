#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');
const dayjs = require('dayjs');

const formatDate = date => {
  return dayjs(date, 'YYYY-MM-DD').toDate();
};

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-d, --date <type>', 'date : date max AAAA-MM-DD');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const date = formatDate(program.date);

  if (!date) {
    exit('Paramètres invalides. Veuillez saisir une date AAAA-MM-DD');
    return;
  }

  const candidatValidee = await db.collection('misesEnRelation').find({ statut: 'recrutee', dateRecrutement: { $lte: date } }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'candidat-validee.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('id du conseiller; Email perso du candidat; date de recrutement prévisionelle; id de la structure; Nom de la structure; SIRET; email de contact\n');
  candidatValidee.forEach(relation => {
    promises.push(new Promise(async resolve => {
      const conseiller = await db.collection('conseillers').findOne({ _id: relation.conseiller.oid });
      const structure = await db.collection('structures').findOne({ _id: relation.structure.oid });
      // eslint-disable-next-line max-len
      file.write(`${conseiller.idPG};${conseiller.email};${dayjs(relation?.dateRecrutement).format('DD/MM/YYYY') ?? 'non renseigné'};${structure.idPG};${structure.nom};${structure?.siret ?? 'non renseigné'};${structure.contact.email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
