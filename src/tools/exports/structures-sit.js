#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const cli = require('commander');
const dayjs = require('dayjs');
const utils = require('../../utils/index.js');

const { execute } = require('../utils');

cli.description('Export structures validées en Coselec pour le projet SIT')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {
  let query = { statut: 'VALIDATION_COSELEC' };
  let count = 0;

  const structures = await db.collection('structures').find(query).toArray();
  let promises = [];
  logger.info(`Generating NDJSON file...`);

  const today = dayjs(new Date()).format('YYYY-MM-DD');
  let jsonFile = path.join(__dirname, '../../../data/exports', `structures_sit_${today}.ndjson`);

  let file = fs.createWriteStream(jsonFile, {
    flags: 'w'
  });

  const structuresTransformees = [];

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      try {
        // Cherche le bon Coselec
        structure.dernierCoselec = utils.getCoselec(structure);

        delete structure.contact;
        delete structure.prefet;

        const stats = await db.collection('stats_StructuresValidees').findOne({ idStructure: structure._id });

        structure.stats = {
          investissementEstimatifEtat: stats?.investissementEstimatifEtat ?? '?',
          nbConseillersEnFormation: stats?.nbConseillersEnFormation ?? '?',
          nbConseillersEnPoste: stats?.nbConseillersEnPoste ?? '?',
          nbConseillersFinalisees: stats?.nbConseillersFinalisees ?? '?',
          nbConseillersRecrutees: stats?.nbConseillersRecrutees ?? '?'
        };

        structuresTransformees.push(structure);
      } catch (e) {
        Sentry.captureException(`Une erreur est survenue sur la structure idPG=${structure.idPG} : ${e}`);
        logger.error(`Une erreur est survenue sur la structure idPG=${structure.idPG} : ${e}`);
      }
      count++;
      resolve();
    }));
  });

  await Promise.all(promises);
  file.write(structuresTransformees.map(JSON.stringify).join('\n')); // ndjson
  logger.info(`${count} structures exported`);
  file.close();
});
