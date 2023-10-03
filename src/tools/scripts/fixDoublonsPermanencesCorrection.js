#!/usr/bin/env node
'use strict';
const csv = require('csv-parser');
const fs = require('fs');
const { execute } = require('../utils');
const { ObjectId } = require('mongodb');

//const getPerm = db => async idPermanence => await db.collection('permanences_test').find({ '_id': new ObjectId(idPermanence) }).toArray();

const getPerms = db => async idConseiller => await db.collection('permanences_test').find({
  'conseillers': {
    '$in': [new ObjectId(idConseiller)]
  }
}).toArray();

execute(__filename, async ({ db }) => {

  const permanences = [];
  const promises = [];

  //eslint-disable-next-line max-len
  //idPermanence|estStructure|nomEnseigne|numeroTelephone|email|siteWeb|siret|adresse|location|horaires|typeAcces|conseillers|lieuPrincipalPour|conseillersItinerants|structure|updatedAt|updatedBy|doublons
  fs.createReadStream('data/exports/permanences-doublons.csv')
  .pipe(csv({ separator: ';' }))
  .on('data', data => permanences.push(data))
  .on('end', () => {
    permanences.forEach(permanence => {
      promises.push(new Promise(async resolve => {
        const perms = await getPerms(db)(permanence.conseillers);
        console.log(perms);
        /*
        permanence.doublons.split(',').forEach(async id => {
          const permSecondaire = await getPerm(db)(id);
          console.log(permSecondaire.structure.$id);
          //console.log(id);
        });*/
        resolve();
      }));
    });
    Promise.all(promises);
  });

});

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
