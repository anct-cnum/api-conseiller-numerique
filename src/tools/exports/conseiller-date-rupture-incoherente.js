#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('cras').distinct('conseiller.$id', { 'structure.$id': { '$exists': false } });
  let promises = [];
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'cnfs_date_rupture_incoherente.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  // eslint-disable-next-line max-len
  file.write('idPG du conseiller,statut;email personnel;info Rupture;idPG structure de la dernière Rupture;Nombre de Cras concerné;date d\'accompagnement du 1er & dernnier Cras après la date de rupture;\n');
  conseillers.forEach(user => {
    promises.push(new Promise(async resolve => {
      const cn = await db.collection('conseillers').findOne({ _id: user });
      const crasCount = await db.collection('cras').find({ 'conseiller.$id': user, 'structure.$id': { '$exists': false } }).toArray();
      const dernierCra = crasCount.slice(-1)[0];
      let idPGSA = '';
      // eslint-disable-next-line max-len
      const dateCra = `${dayjs(crasCount[0]?.cra.dateAccompagnement).format('DD/MM/YYYY')} - ${dayjs(dernierCra?.cra.dateAccompagnement).format('DD/MM/YYYY')}`;
      if (!cn) {
        const cnRupture = (await db.collection('conseillersSupprimes').findOne({ 'conseiller._id': user }))?.conseiller;
        idPGSA = (await db.collection('structures').findOne({ _id: cnRupture.ruptures.slice(-1)[0]?.structureId }))?.idPG;
        // eslint-disable-next-line max-len
        file.write(`Profil SUPPRIMER;${cnRupture?.statut ?? ''};${cnRupture?.email ?? 'email inexistant'};${await cnRupture?.ruptures.map(d => `${dayjs(d?.dateRupture).format('DD/MM/YYYY')} - ${d?.motifRupture}`)};${idPGSA};${crasCount?.length} CRAS;${dateCra};\n`);
      } else {
        idPGSA = (await db.collection('structures').findOne({ _id: cn.ruptures.slice(-1)[0]?.structureId }))?.idPG;
        // eslint-disable-next-line max-len
        file.write(`${cn?.idPG};${cn?.statut ?? ''};${cn?.email};${await cn?.ruptures.map(d => `${dayjs(d?.dateRupture).format('DD/MM/YYYY')} - ${d?.motifRupture}`)};${idPGSA};${crasCount?.length} CRAS;${dateCra}\n`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Export terminé`);
  file.close();
});
