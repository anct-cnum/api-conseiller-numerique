#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const moment = require('moment');

const { insertDailyCrasStats } = require('./tasks/dailyCras');
const { insertDailyCrasStatsByConseiller } = require('./tasks/dailyCrasByConseiller');

cli.description('Statistiques pour les cras journaliers')
.option('-d, --day <jour>', 'Recalcul le nb total de cras journaliers pour une journee avec format 2021-06-01')
.option('-m, --month <mois>', 'Recalcul pour le nb de cras mensuel des conseillers avec debut mois au format 2021-06-01')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  if (cli.day && cli.month) {
    logger.error('Les paramètres day et month sont exclusifs');
    return;
  }

  let dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 1);
  dateDebut.setUTCHours(0, 0, 0, 0);
  let dateFin = new Date();
  dateFin.setDate(dateFin.getDate() - 1);
  dateFin.setUTCHours(23, 59, 59, 59);

  //Si option day
  if (cli.day) {
    if (isNaN(new Date(cli.day))) {
      logger.error('Paramètre day invalide');
      return;
    } else {
      logger.info('Recalcul du nb total de cras pour la journée du ' + moment(new Date(cli.day)).format('DD/MM/YYYY'));
      let dayCustom = new Date(cli.day);
      dateDebut = new Date(dayCustom);
      dateFin = new Date(dayCustom);
      dateFin.setUTCHours(23, 59, 59, 59);
    }
  }

  //Si option month
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
    if (!cli.day && !cli.month) {
      logger.info('Début de récupération des données cras du jour ...' + moment(new Date(dateDebut)).format('DD/MM/YYYY'));
    }
    //Total de cras du jour précédent
    let dailyCras = cli.month ? 0 : await insertDailyCrasStats(db, query, logger, dateDebut);

    //Mise à jour de cras par mois/annee du conseiller
    if ((dailyCras > 0 && !cli.day) || cli.month) {
      await insertDailyCrasStatsByConseiller(db, query, logger, dateDebut, cli.month);
    }

    logger.info('Fin de récupération des statistiques CRA');
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }
});
