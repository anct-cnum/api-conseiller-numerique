#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { execute } = require('../utils');

const getPermanencesDoublons = async db => await db.collection('permanences').aggregate([
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

//ajout des conseillers à la première permanence de la liste
const traitementDoublons = async doublons => {
  const idDoublonSuppression = [];
  let fusionPermanence = doublons[0];
  doublons.shift();
  doublons.forEach(doublon => {
    //on filtre les doublons selon les champs
    if (fusionPermanence.structure.$id === doublon.structure.$id &&
        fusionPermanence.adresse === doublon.adresse &&
        fusionPermanence.nomEnseigne === doublon.nomEnseigne
    ) {
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

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Correction des permanences en doublon');
  const promises = [];
  const permanencesDoubons = await getPermanencesDoublons(db);
  promises.push(new Promise(async resolve => {
    await permanencesDoubons.forEach(async permanencesDoublon => {
      await traitementDoublons(permanencesDoublon.permanences).then(async result => {
        await updatePermanence(db)(result[0]).then(async () => {
          logger.info(`Permanences mise à jour ` + result[0]._id);
          console.log(result[1]);
          await deletePermanences(db)(result[1]);
        });
      });
    });
    resolve();
  }));

  await Promise.all(promises);
  exit();
});
