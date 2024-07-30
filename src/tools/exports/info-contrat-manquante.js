#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');
const dayjs = require('dayjs');

// node src/tools/exports/info-contrat-manquante.js

const formatDate = date => dayjs(date).format('DD/MM/YYYY');

const typeContratOfficial = ['CDD', 'CDI', 'PEC', 'contrat_de_projet_public'];
execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('misesEnRelation').find({
    statut: { $in: ['finalisee', 'terminee', 'finalisee_rupture', 'nouvelle_rupture'] },
    $or: [
      { dateDebutDeContrat: null },
      { dateFinDeContrat: null, typeDeContrat: { '$ne': 'CDI' } },
      { typeDeContrat: null },
    ]
  }).toArray();

  let promises = [];

  logger.info(`${conseillers.length} contrat(s) où il manque des infos ...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'contrat-info-manquante.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  // Partie statistique :
  const status = [...new Set(conseillers.map(e => e.statut))];
  await status.forEach(i => logger.info(`Il y a ${conseillers.filter(e => e.statut === i)?.length} en '${i}' où il manque une info !`));
  logger.info(`Il y a ${conseillers.filter(e => !e.dateDebutDeContrat)?.length} dateDebutDeContrat manquante !`);
  logger.info(`Il y a ${conseillers.filter(e => !e.dateFinDeContrat)?.length} dateFinDeContrat manquante !`);
  logger.info(`Il y a ${conseillers.filter(e => !typeContratOfficial.includes(e.typeDeContrat))?.length} typeDeContrat manquante !`);

  logger.info(`Generating CSV file...`);
  file.write('nom;prenom;conseillerId;structureId;date début contrat; date fin contrat;Type de contrat\n');
  conseillers.forEach(e => {
    promises.push(new Promise(async resolve => {
      const typeDeContrat = !typeContratOfficial.includes(e.typeDeContrat) ? '' : e.typeDeContrat;
      file.write(`${e.conseillerObj.nom};${e.conseillerObj.prenom};${e.conseillerObj.idPG};${e.structureObj.idPG};${e.dateDebutDeContrat ? formatDate(e.dateDebutDeContrat) : ''};${e.dateFinDeContrat ? formatDate(e.dateFinDeContrat) : ''};${typeDeContrat};\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
