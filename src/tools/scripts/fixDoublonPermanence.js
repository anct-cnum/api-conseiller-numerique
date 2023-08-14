#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { execute } = require('../utils');

const getToutesPermanences = async db => db.collection('permanences').find();

const getDoublons = db => async permanence => db.collection('permanences').find({
  'nomEnseigne': permanence.nomEnseigne,
  'adresse': permanence.adresse,
  'location.coordinates': permanence.location?.coordinates,
  'structure': permanence.structure,
  // pour plus de précision (on tombe à 0 doublon avec ces champs)
  //'numeroTelephone': permanence.location?.numeroTelephone,
  // 'email': permanence.location?.email,
}).toArray();

//ajout des conseillers à la première permanence de la liste
const traitementDoublons = async doublons => {
  let fusionPermanence = doublons[0];
  const idDoublonSuppression = [];

  doublons.shift();

  for (let i = 0; i < doublons.length; i++) {
    idDoublonSuppression.push(doublons[i]._id);

    fusionPermanence.email = fusionPermanence.email ?? doublons[i].email;
    fusionPermanence.numeroTelephone = fusionPermanence.numeroTelephone ?? doublons[i].numeroTelephone;

    doublons[i].typeAcces.forEach(type => {
      if (!fusionPermanence.typeAcces.includes(type)) {
        fusionPermanence.typeAcces.push(type);
      }
    });
    doublons[i].conseillers.forEach(idConseiller => {
      if (!fusionPermanence.conseillers.includes(idConseiller)) {
        fusionPermanence.conseillers.push(idConseiller);
      }
    });
    doublons[i].conseillersItinerants.forEach(idConseiller => {
      if (!fusionPermanence.conseillersItinerants.includes(idConseiller)) {
        fusionPermanence.conseillersItinerants.push(idConseiller);
      }
    });
    doublons[i].lieuPrincipalPour.forEach(idConseiller => {
      if (!fusionPermanence.lieuPrincipalPour.includes(idConseiller)) {
        fusionPermanence.lieuPrincipalPour.push(idConseiller);
      }
    });
    //On prend la plage horaire la plus large possible
    doublons[i].horaires.forEach((horaire, i) => {
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

  return [fusionPermanence, idDoublonSuppression];

};

const updatePermanence = db => async permanence => {
  console.log(permanence);
  await db.collection('permanences').replaceOne(
    { '_id': permanence._id },
    permanence,
    { upsert: true });
};

const deletePermanences = db => async idPermanences => await db.collection('permanences').deleteMany({
  '_id': { '$in': idPermanences }
});

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Correction des permanences en doublon');

  const promises = [];
  const listeAvecDoublon = [];
  let countDoublon = 0;
  const permanences = await getToutesPermanences(db);
  permanences.forEach(permanence => {
    promises.push(new Promise(async resolve => {
      const doublonsPerm = await getDoublons(db)(permanence);
      if (doublonsPerm.length > 1 && !listeAvecDoublon.find(perm => perm.nomEnseigne === permanence.nomEnseigne)) {
        try {
          const result = await traitementDoublons(doublonsPerm);
          await new Promise(async resolve => {
            await updatePermanence(db)(result[0]);
            resolve();
          }).then(async resolve => {
            //await deletePermanences(db)(result[1]);
            resolve();
          });
          listeAvecDoublon.push(permanence);
          countDoublon++;
        } catch (error) {
          logger.error(error);
        }
      }
      resolve();
    }));
  });

  await Promise.all(promises);

  logger.info(`${countDoublon} permanences avec doublons ont été corrigées !`);
  exit();
});
