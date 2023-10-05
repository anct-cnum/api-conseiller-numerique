#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { ObjectId } = require('mongodb');


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

const getCrasConseillerPermanence = db => async (idConseillers, idPermanence) => await db.collection('cras').find({
  'conseiller.$id': { '$in': idConseillers },
  'permanence.$id': new ObjectId(idPermanence),
}).limit(20).toArray();

const insertCras = db => async cras => {
  cras.forEach(async cra => {
    console.log(cra);
    await db.collection('cras_test').updateOne(
      { '_id': cra._id },
      { '$setOnInsert': cra },
      { upsert: true });
  });
};

execute(__filename, async ({ logger, db }) => {
  logger.info('Création de la collection de test pour les cras');
  const promises = [];
  const datas = await getPermanencesDoublons(db);
  datas.forEach(data => {
    promises.push(new Promise(async resolve => {
      for (let i = 0; i < data.permanences.length; i++) {
        if (i > 0) {
          const conseillers = data.permanences[i].conseillers;
          const conseillersIds = [];
          for (let y = 0; y < conseillers.length; y++) {
            if (!conseillersIds.find(conseiller => String(conseiller) === String(conseillers[y]))) {
              conseillersIds.push(conseillers[y]);
            }
          }
          await getCrasConseillerPermanence(db)(conseillersIds, data.permanences[0]._id).then(async cras => {
            await insertCras(db)(cras);
          });
        }
      }
      resolve();
    }));
  });

  await Promise.all(promises);
});
