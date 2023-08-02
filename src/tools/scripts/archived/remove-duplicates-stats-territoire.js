#!/usr/bin/env node
'use strict';

const { program } = require('commander');
require('dotenv').config();

const { execute } = require('../../utils');
const deps = require('../../../../data/imports/departements-region.json');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-d, --date <date>', 'Champ date au format JJ/MM/AAAA');
  program.parse(process.argv);

  const date = program.date;
  const regexDate = new RegExp(/^(([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)(202)[1-9])$/);

  if (!date || !regexDate.test(date)) {
    exit('Paramètre date manquant ou invalide');
    return;
  }

  for (const dep of deps) {
    const nbDoublon = await db.collection('stats_Territoires').countDocuments({ date, codeDepartement: dep.num_dep });
    if (nbDoublon > 1) {
      await db.collection('stats_Territoires').deleteOne({ date, codeDepartement: dep.num_dep });
      logger.info(`Doublon supprimé pour ${dep.num_dep} le ${date}`);
    } else {
      logger.info(`Pas de doublon pour ${dep.num_dep} le ${date}`);
    }
  }

  // Cas Saint Martin
  const nbDoublon = await db.collection('stats_Territoires').countDocuments({ date, codeDepartement: '978' });
  if (nbDoublon > 1) {
    await db.collection('stats_Territoires').deleteOne({ date, codeDepartement: '978' });
    logger.info(`Doublon supprimé pour Saint-Martin le ${date}`);
  } else {
    logger.info(`Pas de doublon pour Saint-Martin le ${date}`);
  }

});
