#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const moment = require('moment');

const { insertDailyCrasStats } = require('./tasks/dailyCras');
const { insertDailyCrasStatsByConseiller } = require('./tasks/dailyCrasByConseiller');

cli.description('Statistiques pour les cras journaliers').parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  let dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 1);
  dateDebut.setUTCHours(0, 0, 0, 0);
  let dateFin = new Date();
  dateFin.setDate(dateFin.getDate() - 1);
  dateFin.setUTCHours(23, 59, 59, 59);

  let query = {
    'createdAt': {
      $gte: dateDebut,
      $lt: dateFin,
    }
  };

  try {
    logger.info('Début de récupération des données cras du jour précédent...' + moment(new Date(dateDebut)).format('DD/MM/YYYY'));

    //Total de cras du jour précédent
    let dailyCras = await insertDailyCrasStats(db, query, logger, dateDebut);

    if (dailyCras > 0) {
      //Mise à jour de cras par mois/annee du conseiller
      await insertDailyCrasStatsByConseiller(db, query, logger, dateDebut);
    }

    logger.info('Fin de récupération des données cras du jour précédent...' + moment(new Date(dateDebut)).format('DD/MM/YYYY'));
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }
});
