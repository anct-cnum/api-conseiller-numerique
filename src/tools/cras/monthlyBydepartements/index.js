#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../../utils');
const moment = require('moment');
require('moment/locale/fr');
const departements = require('../../coselec/departements-region.json');
const statsAlltasks = require('./tasks');

cli.description('Statistiques CRAs mensuels par département')
.option('-m, --month <mois>', 'Recalcul pour le nb de CRAs par département mensuel des conseillers avec debut mois au format 2021-06-01')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  //Lancement en cron tous les débuts de mois : calcul les stats CRAs par département du mois précédent
  let dateDebut = new Date();
  dateDebut.setDate(1); //1er jour du mois
  dateDebut.setMonth(dateDebut.getMonth() - 1); //Mois précédent
  dateDebut.setUTCHours(0, 0, 0, 0);

  let dernierJourMois = new Date(dateDebut.getUTCFullYear(), dateDebut.getUTCMonth() + 1, 0).getDate();
  let dateFin = new Date(dateDebut);
  dateFin.setDate(dateDebut.getDate() + dernierJourMois - 1);
  dateFin.setUTCHours(23, 59, 59, 59);

  //Si paramètre saisi : on prend le mois choisit manuellement (utile pour une reprise si besoin)
  if (cli.month) {
    if (isNaN(new Date(cli.month))) {
      logger.error('Paramètre month fourni invalide');
      return;
    } else {
      logger.info('Recalcul des stats CRAs par département pour le mois de ' + moment(new Date(cli.month)).format('MMMM'));
      let moisChoisi = new Date(cli.month);
      dateDebut = new Date(moisChoisi);
      dernierJourMois = new Date(dateDebut.getUTCFullYear(), dateDebut.getUTCMonth() + 1, 0).getDate();
      dateFin = new Date(moisChoisi);
      dateFin.setDate(dateDebut.getDate() + dernierJourMois - 1);
      dateFin.setUTCHours(23, 59, 59, 59);
    }
  }

  let query = {
    'createdAt': {
      $gte: dateDebut,
      $lt: dateFin,
    },
  };

  try {
    if (!cli.month) {
      logger.info('Début de récupération stats CRAs par département pour le mois de ' + moment(new Date(dateDebut)).format('MMMM'));
    }

    //Cas des départements DOMs sur 3 digits (sauf saint martin)
    await statsAlltasks.getStatsDoms(db, query);

    //Cas ST MARTIN (97150)
    await statsAlltasks.getStatsStMartin(db, query);

    //Cas Corse 2A ('200XX', '201XX')
    await statsAlltasks.getStatsCorse2A(db, query);

    //Cas Corse 2B ('202XX', '206XX')
    await statsAlltasks.getStatsCorse2B(db, query);

    //Les autres départements
    await statsAlltasks.getStatsAllOthers(db, query);

    //Formattage du résultat souhaité
    const nouvelleColonne = moment(new Date(dateDebut)).format('MMMM').toString() + ' ' + dateDebut.getFullYear(); //Nom colonne en mois année
    const depsListFormatted = await statsAlltasks.getListDepsFormatted(db, departements, nouvelleColonne);

    //insertion dans la collection Mongo stats_departements_cras la nouvelle colonne mois année
    let promises = [];
    depsListFormatted.forEach(departement => {
      promises.push(new Promise(async resolve => {
        const queryUpd = { 'num_dep': departement.num_dep.toString(), 'dep_name': departement.dep_name };
        const update = { $set: { [nouvelleColonne]: departement[nouvelleColonne] } };
        const options = { upsert: true };
        await db.collection('stats_departements_cras').updateOne(queryUpd, update, options);
        resolve();
      }));
    });
    await Promise.all(promises);

    //Suppression des collections temporaires de calcul
    await db.collection('temporary_corse2a_stats_departements_cras').drop();
    await db.collection('temporary_corse2b_stats_departements_cras').drop();
    await db.collection('temporary_doms_stats_departements_cras').drop();
    await db.collection('temporary_others_stats_departements_cras').drop();
    await db.collection('temporary_stmartin_departements_cras').drop();

    logger.info('Fin de récupération des stats CRAs mensuelles par département');
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }

});
