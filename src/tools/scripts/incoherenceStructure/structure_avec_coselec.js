#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const path = require('path');
const fs = require('fs');
const { getLastCoselec } = require('../../../utils');

const getStructure = async db => await db.collection('structures').find({
  'statut': 'VALIDATION_COSELEC'
}).toArray();

const countMisesEnRelation = db => async idStructure => await db.collection('misesEnRelation').countDocuments({
  'structure.$id': idStructure,
  'statut': { '$in': ['finalisee', 'recrutee'] }
});

execute(__filename, async ({ logger, db, exit }) => {
  logger.info(`Début de la recherche d'incohérence sur le nombre de conseillers lorsqu'une structure a un statut VALIDATION_COSELEC`);
  const promises = [];
  const writeLine = [];

  const structures = await getStructure(db);
  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      await countMisesEnRelation(db)(structure._id).then(countNbConseiller => {
        const coselec = getLastCoselec(structure);
        if (countNbConseiller !== coselec?.nombreConseillersCoselec) {
          writeLine.push('La structure avec l\'id ' + String(structure._id) +
          ' a un nombreConseillersCoselec de ' + coselec.nombreConseillersCoselec +
          ' mais comporte ' + countNbConseiller + ' mise(s) en relation\n'
          );
        }
      });
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info('Génération du fichier texte dans data/exports/incoherence_structure_coselec_nombre_cnfs.txt');
  let txtFile = path.join(__dirname, '../../../../data/exports', `incoherence_structure_coselec_nombre_cnfs.txt`);
  let file = fs.createWriteStream(txtFile, {
    flags: 'w'
  });
  writeLine.forEach(line => {
    file.write(String(line));
  });
  file.close();
  logger.info('Fin de la génération du fichier texte.');

  logger.info(`Fin de la recherche d'incohérence sur le nombre de conseillers lorsqu'une structure a un statut VALIDATION_COSELEC`);
  exit();
});
