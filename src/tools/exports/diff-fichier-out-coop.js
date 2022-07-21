#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const { execute } = require('../utils');
const dayjs = require('dayjs');
const { PRIORITY_BELOW_NORMAL } = require('constants');

require('dotenv').config();

program
.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const conseillers = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return conseillers;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'cnfs-manquant_out_coop.csv');
  const formatDate = date => dayjs(date).format('DD/MM/YYYY');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  // eslint-disable-next-line max-len
  file.write('Nom;Prenom;Mail CNFS;Date de départ en formation;Date de fin de formation;ID structure;ID conseiller\n');

  const csv = await readCSV(program.csv);
  const cnfsFichierOutCOOP = csv.map(t => parseInt(t['ID conseiller']));
  const cnfsRECRUTE = await db.collection('conseillers').distinct('idPG', { 'statut': 'RECRUTE' });
  const cnfsManquant = cnfsRECRUTE.filter(e => !cnfsFichierOutCOOP.includes(e));
  const cnfs = await db.collection('conseillers').find({ idPG: { '$in': cnfsManquant } }).toArray();

  cnfs.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const { structureId, nom, prenom, email, datePrisePoste, dateFinFormation, idPG } = conseiller;
      const idStructure = await db.collection('structures').findOne({ _id: structureId });
      // eslint-disable-next-line max-len
      file.write(`${nom};${prenom};${email};${formatDate(datePrisePoste)};${formatDate(dateFinFormation)};${idStructure?.idPG};${idPG}\n`);
      resolve();
    }));
  });

  await Promise.all(promises);
  file.close();
});

