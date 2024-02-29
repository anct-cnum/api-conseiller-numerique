#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { execute } = require('../../utils');

program.description('Correction des statistiques evolution des cras')
.option('-nbm, --nombremois <nombre de mois>', 'Nombre de mois max +1')
.option('-a, --annee <année>', 'Année à selectionner')
.helpOption('-e', 'HELP command')
.parse(process.argv);

const getStatsEvolutionCras = db => async query => await db.collection('stats_conseillers_cras').find(query).toArray();

const updateEvolutionCras = db => async (id, annee, data) => await db.collection('stats_conseillers_cras').updateOne({ _id: id },
  { $set: {
    [annee]: data
  } });

execute(__filename, async ({ logger, db }) => {

  const { annee, nombremois } = program.opts();
  const promises = [];
  let count = 0;

  if (!annee || !nombremois) {
    logger.error('Vous devez renseigner une année et un nombre de mois valide');
    return;
  }

  const query = {
    [annee]: { '$size': Number(nombremois) }
  };

  const evolutions = await getStatsEvolutionCras(db)(query);
  evolutions.forEach(evolution => {
    evolution[annee].pop();
    promises.push(new Promise(async resolve => {
      await updateEvolutionCras(db)(evolution._id, annee, evolution[annee]);
      count++;
      resolve();
    }));
  });

  await Promise.all(promises);

  logger.info('Traitement terminé ! ' + count + ' statistiques ont été traités');

});
