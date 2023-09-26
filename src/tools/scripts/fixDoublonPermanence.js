#!/usr/bin/env node
'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const cli = require('commander');
const { program } = require('commander');
const { execute } = require('../utils');

const getPermanencesDoublonsByLocation = async db => await db.collection('permanences').aggregate([
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

const getPermanencesDoublonsByAdresse = async db => await db.collection('permanences').aggregate([
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

const getPermanencesDoublons = async (permByLocation, permByAdresse) => {
  await permByLocation.forEach(pBylocation => {
    if (!permByAdresse.find(pByAdresse =>
      pByAdresse.location.coordinates[0] === pBylocation.location.coordinates[0] &&
      pByAdresse.location.coordinates[1] === pBylocation.location.coordinates[1])) {
      permByAdresse.push(pBylocation);
    }
  });
  return permByAdresse;
};

const createCsvPermanences = async permanencesDoublons => {
  let csvFile = path.join(__dirname, '../../../data/exports', 'permanences-doublons.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write(
    'idPermanence;' +
    'estStructure;' +
    'nomEnseigne;' +
    'numeroTelephone;' +
    'email;' +
    'siteWeb;' +
    'siret;' +
    'adresse;' +
    'location;' +
    'horaires;' +
    'typeAcces;' +
    'conseillers;' +
    'lieuPrincipalPour;' +
    'conseillersItinerants;' +
    'structure;' +
    'updatedAt;' +
    'updatedBy;' +
    'doublons;\n');

  permanencesDoublons.forEach(doublon => {
    let writePermanence = '';
    doublon.permanences.forEach((permanence, i) => {
      if (i === 0) {
        // eslint-disable-next-line max-len
        writePermanence = `${permanence._id};${permanence.estStructure};${permanence.nomEnseigne};${permanence.numeroTelephone};${permanence.email};${permanence.siteWeb};${permanence.siret};${permanence.adresse};${permanence.location};${permanence.horaires};${permanence.typeAcces};${permanence.conseillers};${permanence.lieuPrincipalPour};${permanence.conseillersItinerants};${permanence.structure.oid};${permanence.updatedAt};${permanence.updatedBy};`;
      } else {
        writePermanence += permanence._id;
        writePermanence += doublon.permanences.length > i + 1 ? ',' : '';
      }
    });
    file.write(`${writePermanence}\n`);
  });
  file.close();
};

//ajout des conseillers à la première permanence de la liste
const traitementDoublons = async doublons => {
  const idDoublonSuppression = [];
  let fusionPermanence = doublons[0];
  doublons.shift();
  doublons.forEach(doublon => {
    //on filtre les doublons selon les champs
    if (fusionPermanence.structure.$id === doublon.structure.$id) {
      idDoublonSuppression.push(doublon._id);
      fusionPermanence.email = fusionPermanence.email ?? doublon.email;
      fusionPermanence.numeroTelephone = fusionPermanence.numeroTelephone ?? doublon.numeroTelephone;
      doublon.typeAcces.forEach(type => {
        if (!fusionPermanence.typeAcces.includes(type)) {
          fusionPermanence.typeAcces.push(type);
        }
      });
      doublon.conseillers.forEach(idConseiller => {
        if (!fusionPermanence.conseillers.some(val => val.equals(idConseiller))) {
          fusionPermanence.conseillers.push(idConseiller);
        }
      });
      doublon.conseillersItinerants?.forEach(idConseiller => {
        if (!fusionPermanence.conseillersItinerants.some(val => val.equals(idConseiller))) {
          fusionPermanence.conseillersItinerants.push(idConseiller);
        }
      });
      doublon.lieuPrincipalPour?.forEach(idConseiller => {
        if (!fusionPermanence.lieuPrincipalPour.some(val => val.equals(idConseiller))) {
          fusionPermanence.lieuPrincipalPour.push(idConseiller);
        }
      });
      //On prend la plage horaire la plus large possible
      doublon.horaires.forEach((horaire, i) => {
        let hmatinA = '';
        let hmatinB = '';
        let hapresmidiA = '';
        let hapresmidiB = '';
        if (fusionPermanence.horaires[i].matin[0] !== 'Fermé' && horaire.matin[0] !== 'Fermé') {
          hmatinA = fusionPermanence.horaires[i].matin[0] > horaire.matin[0] ? horaire.matin[0] : fusionPermanence.horaires[i].matin[0];
          hmatinB = fusionPermanence.horaires[i].matin[1] < horaire.matin[1] ? horaire.matin[1] : fusionPermanence.horaires[i].matin[1];
        }
        if (fusionPermanence.horaires[i].apresMidi[0] !== 'Fermé' && horaire.apresMidi[0] !== 'Fermé') {
          hapresmidiA = fusionPermanence.horaires[i].apresMidi[0] > horaire.apresMidi[0] ? horaire.apresMidi[0] : fusionPermanence.horaires[i].apresMidi[0];
          hapresmidiB = fusionPermanence.horaires[i].apresMidi[1] < horaire.apresMidi[1] ? horaire.apresMidi[1] : fusionPermanence.horaires[i].apresMidi[1];
        }
        if (fusionPermanence.horaires[i].matin[0] === 'Fermé') {
          hmatinA = horaire.matin[0];
          hmatinB = horaire.matin[1];
        }
        if (fusionPermanence.horaires[i].apresMidi[0] === 'Fermé') {
          hapresmidiA = horaire.apresMidi[0];
          hapresmidiB = horaire.apresMidi[1];
        }
        fusionPermanence.horaires[i].matin = [hmatinA, hmatinB];
        fusionPermanence.horaires[i].apresMidi = [hapresmidiA, hapresmidiB];
      });
    }
  });
  fusionPermanence.updatedAt = new Date();

  return [fusionPermanence, idDoublonSuppression];
};

const updatePermanence = db => async permanence => await db.collection('permanences').replaceOne(
  { '_id': permanence._id },
  permanence,
  { upsert: true });

const deletePermanences = db => async idPermanences => await db.collection('permanences').deleteMany({
  '_id': { '$in': idPermanences }
});

const changePermanenceIdCra = db => async (oldIds, newId) => await db.collection('cras').updateMany(
  { 'permanence.$id': { '$in': oldIds } },
  { '$set': { 'permanence.$id': newId } }
);

cli.description('Détecter et corriger les doublons de permanence')
.option('-f, --fix', 'Fusion des permanences et suppression des doublons')
.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Correction des permanences en doublon');
  const promises = [];

  logger.info(`Obtention des doublons de permanences...`);
  const permByLocation = await getPermanencesDoublonsByLocation(db);
  const permByAdresse = await getPermanencesDoublonsByAdresse(db);
  const permanencesDoublons = await getPermanencesDoublons(permByLocation, permByAdresse);

  logger.info(`Génération du fichier CSV ...`);
  await createCsvPermanences(permanencesDoublons);
  logger.info(`Fichier CSV déposé dans data/exports/permanences-doublons.csv`);

  if (program.fix) {
    permanencesDoublons.forEach(async permanencesDoublon => {
      promises.push(new Promise(async resolve => {
        await traitementDoublons(permanencesDoublon.permanences).then(async result => {
          await updatePermanence(db)(result[0]).then(async () => {
            logger.info(`Permanences mise à jour ` + result[0]._id);
            logger.info(`Suppression des permanences avec les ids :` + result[1].toString());
            await deletePermanences(db)(result[1]);
            logger.info(`Changement des ids de permanences dans les cras correspondant :` + result[1].toString() + ' -> ' + result[0]._id.toString());
            await changePermanenceIdCra(db)(result[1], result[0]._id);
          });
        });
        resolve();
      }));
    });
  }
  await Promise.all(promises);
  exit();
});
