#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const { getPermanencesDoublons, createCsvFile } = require('./fix_doublons_functions.utils');

const createCsv = permanencesDoublons => {
  const csvHeader = 'location;idPermanence;idStructure;conseillers;lieuPrincipalPour;newIdPermanence';
  createCsvFile('permanences-structure-correction', csvHeader, 'permanences', permanencesDoublons);
};

const updatePermanence = db => async permanence => await db.collection('permanences')
.replaceOne({ '_id': permanence._id }, permanence, { upsert: true });

program.option('-f, --fix <fix>', 'lot du fichier');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  logger.info('Etape 1 :');
  logger.info('Création du csv de rollback du script des doublons de permanences');
  const permanencesDoublons = await getPermanencesDoublons(db);
  createCsv(permanencesDoublons);
  logger.info('Csv Créé avec succès et placé dans data/exports/permanences-structure-correction.csv');

  if (program.fix) {
    logger.info('Etape 2 :');
    logger.info('Rollback du script des doublons de permanences');
    const promises = [];
    permanencesDoublons.forEach(doublons => {
      doublons.permanences.forEach(permanence => {
        promises.push(new Promise(async resolve => {
          await updatePermanence(db)(permanence);
          resolve();
        }));
      });
    });
    await Promise.all(promises);
  }
});
