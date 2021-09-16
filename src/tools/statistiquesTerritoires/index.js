#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const { ObjectID } = require('mongodb');
const dayjs = require('dayjs');
const utilsStructure = require('../../utils/index.js');
const departements = require('../../../data/imports/departements-region.json');

cli.description('Statistiques pour les territoires').parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  logger.info('Récupération des différentes données nécessaires aux statistiques par territoire...');
  const deps = new Map();
  departements.push({
    'num_dep': '00',
    'dep_name': 'TOM',
    'region_name': 'TOM',
  }, {
    'num_dep': '978',
    'dep_name': 'Saint-Martin',
    'region_name': 'Saint-Martin',
  }, {
    'num_dep': '988',
    'dep_name': 'Nouvelle-Calédonie',
    'region_name': 'Nouvelle-Calédonie',
  });

  for (const value of departements) {
    deps.set(String(value.num_dep), value);
  }

  let promiseStructure = [];
  let promiseConseillers = [];

  await deps.forEach(departement => {
    promiseStructure.push(new Promise(async resolve => {
      const structures = await db.collection('structures').find({ 'statut': 'VALIDATION_COSELEC', 'codeDepartement': String(departement.num_dep) }).toArray();

      let depStats = {};
      depStats.date = dayjs(new Date()).format('DD/MM/YYYY');
      depStats.nombreConseillersCoselec = 0;
      depStats.cnfsActives = 0;
      depStats.cnfsInactives = 0;
      depStats.conseillerIds = [];

      structures.forEach(structure => {
        depStats.codeDepartement = String(departement.num_dep) === '00' ? String(structure.codeCommune.substring(0, 3)) : String(departement.num_dep);
        depStats.codeRegion = String(structure.codeRegion) === '00' ? String(structure.codeCommune.substring(0, 3)) : String(structure.codeRegion);

        depStats.nomDepartement = String(departement.num_dep) === '00' ?
          departements.get(String(structure.codeCommune.substring(0, 3))).dep_name : departement.dep_name;
        depStats.nomRegion = String(structure.codeRegion) === '00' ?
          departements.get(String(structure.codeCommune.substring(0, 3))).dep_name : departement.region_name;

        const coselec = utilsStructure.getCoselec(structure);
        depStats.nombreConseillersCoselec += coselec?.nombreConseillersCoselec ?? 0;
        depStats.cnfsInactives = depStats.nombreConseillersCoselec;

        promiseConseillers.push(new Promise(async resolve => {

          const conseillers = await db.collection('conseillers').find({
            'statut': 'RECRUTE',
            'structureId': structure._id
          }).toArray();

          if (conseillers.length > 0) {
            let userPromises = [];
            conseillers.forEach(conseiller => {
              depStats.conseillerIds.push(conseiller._id);
              userPromises.push(new Promise(async resolve => {
                const isActive = await db.collection('users').countDocuments({
                  'entity.$id': new ObjectID(conseiller._id), 'entity.$ref': 'conseillers', 'passwordCreated': true
                });
                if (isActive > 0) {
                  depStats.cnfsActives += 1;
                  depStats.cnfsInactives -= 1;
                }
                resolve();
              }));
            });
            await Promise.all(userPromises);
          }
          resolve();
        }));
      });
      await Promise.all(promiseConseillers);

      depStats.tauxActivation = (depStats?.nombreConseillersCoselec) ? Math.round(depStats?.cnfsActives * 100 / (depStats?.nombreConseillersCoselec)) : 0;

      if (structures.length > 0) {
        try {
          logger.info('Insertion de l\'aggregation des ' + structures.length + ' structure(s) du département  ' + departement.num_dep);
          await db.collection('stats_Territoires').insertOne(depStats);
        } catch (error) {
          logger.error(error);
          Sentry.captureException(error);
        }
      } else {
        logger.info('Pas de structure valide pour le département : ' + departement.num_dep);
      }
      resolve();
    }));
  });
  await Promise.all(promiseStructure);

});
