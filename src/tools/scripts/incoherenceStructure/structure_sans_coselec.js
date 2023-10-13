#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const path = require('path');
const fs = require('fs');

const getStructures = async db => await db.collection('structures').find({
  'statut': { '$ne': 'VALIDATION_COSELEC' }
}).toArray();

const countUserStructure = db => async idStructure => await db.collection('users').countDocuments({
  'entity.$id': idStructure
});

const countStatutsIncorrects = db => async idStructure => await db.collection('misesEnRelation').aggregate(
  { '$match': {
    'structure.$id': idStructure,
    'statut': { '$ne': 'finalisee_rupture' }
  } },
  { '$group': {
    '_id': '$statut',
    'countStatut': { '$sum': 1 }
  } },
  { '$project': {
    '_id': '$_id',
    'countStatut': '$countStatut'
  } }
).toArray();

const getMisesEnRelation = db => async idStructure => await db.collection('misesEnRelation').find({
  'structure.$id': idStructure,
  'statut': 'finalisee_rupture'
}).toArray();

execute(__filename, async ({ logger, db, exit }) => {
  logger.info('Début de la recherche d\'incohérence lorsqu\'une structure a un statut autre que VALIDATION_COSELEC');
  const promises = [];
  const writeLine = [];
  const structures = await getStructures(db);

  logger.info(structures.length + ' structures en cours d\'observation...');
  structures.forEach(structure => {
    let erreursDetectees = 0;
    promises.push(new Promise(async resolve => {
      let line = 'La structure avec l\'id ' + String(structure._id);
      const resultats = await countStatutsIncorrects(db)(structure._id);
      if (resultats.length > 0) {
        line += ' comporte : \n';
        line += '- ';
        for (const resultat of resultats) {
          erreursDetectees++;
          line += resultat.countStatut + ' statut de valeur ' + String(resultat._id);
          if (resultats.length > 1) {
            line += ' | ';
          }
        }
        line += '\n';
      } else {
        line += ' comporte : \n';
        const misesEnRelation = await getMisesEnRelation(db)(structure._id);
        if (misesEnRelation.length > 0) {
          for (const miseEnRelation of misesEnRelation) {
            if (miseEnRelation.conseillerObj.userCreated === true) {
              erreursDetectees++;
              line += '- Une mise en relation avec userCreated à true pour le conseiller id ' +
              String(miseEnRelation.conseillerObj._id) + '\n';
            }
          }
        }
      }

      const countUsers = await countUserStructure(db)(structure._id);
      if (countUsers > 0) {
        erreursDetectees++;
        line += ' comporte : \n';
        line += countUsers + ' user(s) encore actif(s) en base';
      }
      if (erreursDetectees > 0) {
        writeLine.push(line);
        logger.info('Structure : ' + structure._id + ' => ' + erreursDetectees + ' erreur(s)');
      }
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info('Génération du fichier texte dans data/exports/incoherence_structure_sans_coselec.txt');
  let txtFile = path.join(__dirname, '../../../../data/exports', `incoherence_structure_sans_coselec.txt`);
  let file = fs.createWriteStream(txtFile, {
    flags: 'w'
  });
  writeLine.forEach(line => {
    file.write(String(line));
  });
  file.close();
  logger.info('Fin de la génération du fichier texte.');

  logger.info('Fin de la recherche d\'incohérence lorsqu\'une structure a un statut autre que VALIDATION_COSELEC');
  exit();
});
