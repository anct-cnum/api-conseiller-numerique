#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../../utils');
const moment = require('moment');
require('moment/locale/fr');
const departements = require('../../../../src/tools/coselec/departements-region.json');

cli.description('Statistiques CRAs mensuels par département')
.option('-m, --month <mois>', 'Recalcul pour le nb de CRAs par département mensuel des conseillers avec debut mois au format 2021-06-01')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  //Lancement en cron tous les débuts de mois : calcul les stats par departement du mois précédent
  let dateDebut = new Date();
  dateDebut.setDate(1); //1er jour du mois
  dateDebut.setMonth(dateDebut.getMonth() - 1); //Mois précédent
  dateDebut.setUTCHours(0, 0, 0, 0);
  let lastDayOfMonth = new Date(dateDebut.getUTCFullYear(), dateDebut.getUTCMonth() + 1, 0).getDate();
  let dateFin = new Date(dateDebut);
  dateFin.setDate(dateDebut.getDate() + lastDayOfMonth - 1);
  dateFin.setUTCHours(23, 59, 59, 59);

  //Si paramètre saisi : on prend le paramètre fourni
  if (cli.month) {
    if (isNaN(new Date(cli.month))) {
      logger.error('Paramètre month fourni invalide');
      return;
    } else {
      logger.info('Recalcul des stats CRAs par departement pour le mois ' + moment(new Date(cli.month)).format('MMMM'));
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
    },
  };

  try {
    if (!cli.month) {
      logger.info('Début de récupération stats CRAs par departement pour le mois ' + moment(new Date(dateDebut)).format('MMMM'));
    }

    //Cas des départements DOMs sur 3 digits (et pas saint martin)
    let statsDom = await db.collection('cras').aggregate(
      [
        { $match: { ...query,
          $and: [
            { 'cra.codePostal': { $regex: /(?:^97)|(?:^98)/ } },
            { 'cra.codePostal': { $ne: '97150' } },
          ] } },
        { $group: { _id: {
          departement: { $substr: ['$cra.codePostal', 0, 3] },
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' } },
        count: { $sum: {
          $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
        } } } },
        { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
      ]
    ).toArray();

    //Cas ST MARTIN
    let statsMartin = await db.collection('cras').aggregate(
      [
        { $match: { ...query, 'cra.codePostal': { $eq: '97150' } } },
        { $group: { _id: {
          departement: '97150',
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' } },
        count: { $sum: {
          $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
        } } } },
        { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
      ]
    ).toArray();

    //Cas Corse 2A '200', '201'
    let stats2A = await db.collection('cras').aggregate(
      [
        { $match: { ...query, 'cra.codePostal': { $regex: /(?:^200)|(?:^201)/ } } },
        { $group: { _id: {
          departement: '2A',
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' } },
        count: { $sum: {
          $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
        } } } },
        { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
      ]
    ).toArray();

    //Cas Corse 2B '202', '206'
    let stats2B = await db.collection('cras').aggregate(
      [
        { $match: { ...query, 'cra.codePostal': { $regex: /(?:^202)|(?:^206)/ } } },
        { $group: { _id: {
          departement: '2B',
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' } },
        count: { $sum: {
          $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
        } } } },
        { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
      ]
    ).toArray();

    //Les autres départements
    let statsDep = await db.collection('cras').aggregate(
      [
        { $match: { ...query, 'cra.codePostal': { $not: /(?:^97)|(?:^98)/ } } },
        { $group: { _id: {
          departement: { $substr: ['$cra.codePostal', 0, 2] },
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' } },
        count: { $sum: {
          $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
        } } } },
        { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
      ]
    ).toArray();

    //Formate le résultat souhaité
    const nouvelleColonne = moment(new Date(dateDebut)).format('MMMM').toString() + ' ' + dateDebut.getFullYear();
    const deps = new Map();
    for (const value of departements) {
      //Insertion des stats
      //CAS DOM
      let statDep;
      if ((value['num_dep'].toString().startsWith('97') || value['num_dep'].toString().startsWith('98')) && value['num_dep'].toString().startsWith('97150')) {
        statDep = statsDom?.find(stat => stat._id['departement'] === value['num_dep'].toString());
        //CAS CORSE
      } else if (value['num_dep'].toString().startsWith('2A')) {
        statDep = stats2A?.find(stat => stat._id['departement'] === value['num_dep'].toString());
      } else if (value['num_dep'].toString().startsWith('2B')) {
        statDep = stats2B?.find(stat => stat._id['departement'] === value['num_dep'].toString());
      } else {
        statDep = statsDep?.find(stat => stat._id['departement'] === value['num_dep'].toString());
      }

      value[nouvelleColonne] = statDep?.valeur ?? 0;
      deps.set(String(value.num_dep), value);
    }

    //CAS TOMS (manuel car ne sont pas réellement des départements...)
    let stMartin = {
      num_dep: 978,
      dep_name: 'Saint-Martin',
      region_name: 'Saint-Martin',
      [nouvelleColonne]: statsMartin?.find(stat => stat._id['departement'] === '97150')?.valeur ?? 0
    };
    deps.set(String(978), stMartin);
    let nouvelleCaledonie = {
      num_dep: 988,
      dep_name: 'Nouvelle-Calédonie',
      region_name: 'Nouvelle-Calédonie',
      [nouvelleColonne]: statsDom?.find(stat => stat._id['departement'] === '988')?.valeur ?? 0
    };
    deps.set(String(988), nouvelleCaledonie);

    //insertion dans collection Mongo pour Metabase
    let promises = [];
    deps.forEach(departement => {
      promises.push(new Promise(async resolve => {
        const queryUpd = { 'num_dep': departement.num_dep.toString(), 'dep_name': departement.dep_name };
        const update = { $set: { [nouvelleColonne]: departement[nouvelleColonne] } };
        const options = { upsert: true };
        await db.collection('stats_departements_cras').updateOne(queryUpd, update, options);
        resolve();
      }));
    });
    await Promise.all(promises);

    logger.info('Fin de récupération des stats CRAs par departement');
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }

});
