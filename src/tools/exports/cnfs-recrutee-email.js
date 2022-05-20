#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-d, --departement <departement>', 'departement: le code departement');
  program.option('-r, --region <region>', 'region: le code region');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const codeDepartement = program.departement;
  const codeRegion = program.region;
  if (!codeDepartement && !codeRegion) {
    exit('Veuillez entrer un code departement ou un code region avec la commande --departement ou --region');
    return;
  }
  let parametre;
  let info;
  if (codeDepartement) {
    parametre = {
      'statut': 'finalisee',
      'structureObj.codeDepartement': codeDepartement
    };
    info = `code département ${codeDepartement}`;
  } else if (codeRegion) {
    parametre = {
      'statut': 'finalisee',
      'structureObj.codeRegion': codeRegion
    };
    info = `code région : ${codeRegion}`;
  }

  const cnfsFinalisee = await db.collection('misesEnRelation').find(parametre).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'cnfs-recrutee-email.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('Nom; Prénom; Email Perso; Email @conseiller-numerique.fr\n');
  cnfsFinalisee.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const cnfs = await db.collection('conseillers').findOne({ _id: conseiller.conseiller.oid });
      // eslint-disable-next-line max-len
      file.write(`${cnfs?.nom ?? 'non renseigné'};${cnfs?.prenom ?? 'non renseigné'};${cnfs?.email ?? 'non renseigné'};${cnfs?.mattermost?.id ?? 'compte non créé'}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
  logger.info(`Export de ${cnfsFinalisee.length} conseiller(s) recruté(s) pour le ${info}`);
});
