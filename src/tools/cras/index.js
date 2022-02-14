#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const moment = require('moment');

const { insertDailyCrasStatsByConseiller } = require('./tasks/dailyCrasByConseiller');

cli.description('Statistiques pour les cras journaliers')
.option('-m, --month <mois>', 'Recalcul pour le nb de cras mensuel des conseillers avec debut mois au format 2021-06-01')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  let dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 1);
  dateDebut.setUTCHours(0, 0, 0, 0);
  let dateFin = new Date();
  dateFin.setDate(dateFin.getDate() - 1);
  dateFin.setUTCHours(23, 59, 59, 59);

  if (cli.month) {
    if (isNaN(new Date(cli.month))) {
      logger.error('Paramètre month invalide');
      return;
    } else {
      logger.info('Recalcul des stats du mois des conseillers pour le mois ' + moment(new Date(cli.month)).format('MM'));
      let monthCustom = new Date(cli.month);
      dateDebut = new Date(monthCustom);
      let lastDayOfMonth = new Date(dateDebut.getUTCFullYear(), dateDebut.getUTCMonth() + 1, 0).getDate();
      dateFin = new Date(monthCustom);
      dateFin.setDate(dateDebut.getDate() + lastDayOfMonth - 1);
      dateFin.setUTCHours(23, 59, 59, 59);
    }
  }

  let query = {
    'createdAt': {
      $gte: dateDebut,
      $lt: dateFin,
    }
  };

  try {
    logger.info('Début de récupération des données CRAs du jour ...' + moment(new Date(dateDebut)).format('DD/MM/YYYY'));
    //Mise à jour de cras par mois/annee du conseiller
    await insertDailyCrasStatsByConseiller(db, query, logger, dateDebut);
    logger.info('Fin de récupération des statistiques CRAs');
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }
});
