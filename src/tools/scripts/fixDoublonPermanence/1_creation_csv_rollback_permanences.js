#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const path = require('path');
const fs = require('fs');

const getPermanencesDoublonsByLocation = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$location' },
  { '$group': {
    '_id': '$location',
    'permanences': { '$push': '$$ROOT' },
    'count': { '$sum': 1 }
  } },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id',
    'permanences': '$permanences'
  } }
]).toArray();

const getPermanencesDoublonsByAdresse = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$adresse' },
  { '$unwind': '$location' },
  { '$group': {
    '_id': { 'adresse': '$adresse', 'location': '$location' },
    'permanences': { '$push': '$$ROOT' },
    'count': { '$sum': 1 }
  } },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id.location',
    'permanences': '$permanences'
  } }
]).toArray();

const getPermanencesDoublons = async db => {
  const permByLocation = await getPermanencesDoublonsByLocation(db);
  const permByAdresse = await getPermanencesDoublonsByAdresse(db);
  permByLocation.forEach(pBylocation => {
    if (!permByAdresse.find(pByAdresse =>
      pByAdresse.location.coordinates[0] === pBylocation.location.coordinates[0] &&
      pByAdresse.location.coordinates[1] === pBylocation.location.coordinates[1])) {
      permByAdresse.push(pBylocation);
    }
  });
  return permByAdresse;
};

const createCsv = permanencesDoublons => {
  let csvFile = path.join(__dirname, '../../../../data/exports', 'permanences-structure-correction.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write(
    'location;' +
    'idPermanence;' +
    'idStructure;' +
    'conseillers;' +
    'lieuPrincipalPour;' +
    'newIdPermanence;\n');

  let writePermanence = '';
  permanencesDoublons.forEach(doublons => {
    for (let i = 0; i < doublons.permanences.length; i++) {
      if (i > 0) {
        writePermanence += `${String(doublons.permanences[i].location.coordinates)};${doublons.permanences[i]._id};`;
        writePermanence += `${doublons.permanences[i].structure.oid};${doublons.permanences[i].conseillers};`;
        writePermanence += `${doublons.permanences[i].lieuPrincipalPour};${doublons.permanences[0]._id}`;
        writePermanence += `\n`;
      }
    }
  });
  file.write(writePermanence);
  file.close();
};

const updatePermanence = db => async permanence => await db.collection('permanences_test')
.replaceOne({ '_id': permanence._id }, permanence, { upsert: true });

program.option('-f, --fix <fix>', 'lot du fichier');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  logger.info('Etape 1 :');
  logger.info('Création du csv de rollback du script des doublons de permanences');
  const permanencesDoublons = await getPermanencesDoublons(db);
  createCsv(permanencesDoublons);
  logger.info('Csv Créé avec succès et placé dans data/exports/permanences-structure-correction.csv');

  if (program.fix) {
    logger.info('Etape 2 :');
    logger.info('Rollback du script des doublons de permanences');
    const promises = [];
    permanencesDoublons.forEach(doublons => {
      doublons.permanences.forEach(permanence => {
        promises.push(new Promise(async resolve => {
          await updatePermanence(db)(permanence);
          resolve();
        }));
      });
    });
    await Promise.all(promises);
  }
});

/** -------------------------------------------------------------------------------------------------------------------- */
/** ----------------------------------------------- HISTORIQUE DE TEST ------------------------------------------------- */
/** -------------------------------------------------------------------------------------------------------------------- */
/*
const getPermanencesDoublonsEnErreur = async permanencesDoublons => {
  const permanencesDoublonsEnErreur = [];
  const promises = [];

  permanencesDoublons.forEach((permanenceDoublon, i) => {
    promises.push(new Promise(async resolve => {
      console.log('Doublon N°' + i);
      permanenceDoublon.permanences.forEach((permanence, i) => {
        if (i > 0 && String(permanence.structure.oid) !== String(permanenceDoublon.permanences[0].structure.oid)) {
          permanencesDoublonsEnErreur.push(permanenceDoublon);
        }
      });
      resolve();
    }));
  });

  Promise.all(promises);

  return permanencesDoublonsEnErreur;
};
*/
/*

  // location par défaut [1.849121,46.624100] Gérer à la main
const getPermanenceDefaultLocation = async db => await db.collection('permanences_temp').find({
  'location.coordinates': [1.849121, 46.624100]
}).toArray();

const getConseillerIdPlusieursLieuPrincipaux = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$lieuPrincipalPour' },
  { '$group':
    {
      '_id': '$lieuPrincipalPour',
      'count': { '$sum': 1 }
    }
  },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 1,
    'count': 1
  } }
]).toArray();

const getConseillerIdMultipleStructures = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$conseillers' },
  { '$unwind': '$structure' },
  { '$group':
    {
      '_id': { 'conseillers': '$conseillers', 'structure': '$structure' },
      'count': { '$sum': 1 }
    }
  },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 1,
    'count': 1
  } }
]).toArray();
*/
/* requête de correction des cras
  db.getCollection('cras').updateMany(
  { 'conseiller.$id': idConseiller, 'permanence.$id': permanenceIdErreur },
  { '$set': { 'permanence.$id': permanenceIdOK } }
);
*/

//const getPerm = db => async idPermanence => await db.collection('permanences_test').find({ '_id': new ObjectId(idPermanence) }).toArray();
/*const getPermanencesDoublonsByLocation = async db => await db.collection('permanences').aggregate([
  { '$unwind': '$location' },
  { '$group': {
    '_id': '$location',
    'permanences': { '$push': '$$ROOT' },
    'count': { '$sum': 1 }
  } },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id',
    'permanences': '$permanences'
  } }
]).toArray();

const getConseillers = async db => await db.collection('conseillers').find({ 'hasPermanence': true }).toArray();

const getDoublonParConseillerStructure = db => async (idConseiller, idStructure) => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$location' },
  { '$group': {
    '_id': '$location',
    'permanencesId': { '$push': '$$ROOT._id' },
    'conseillersId': { '$push': '$$ROOT.conseillers' },
    'structuresId': { '$push': '$$ROOT.structure' },
    'count': { '$sum': 1 }
  }
  },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id',
    'permanencesId': '$permanencesId',
    'conseillersId': '$conseillersId',
    'structuresId': '$structuresId'
  } }
]).toArray();

const getPermsTemp = db => async idConseiller => await db.collection('permanences_temp').find({
  'conseillers': {
    '$in': [new ObjectId(idConseiller)]
  }
}).toArray();

const getPerms = db => async idConseiller => await db.collection('permanences').find({
  'conseillers': {
    '$in': [new ObjectId(idConseiller)]
  }
}).toArray();
*/
/** -------------------------------------------------------------------------------------------------------------------- */
/** ------------------------------------------- FIN HISTORIQUE DE TEST ------------------------------------------------- */
/** -------------------------------------------------------------------------------------------------------------------- */
