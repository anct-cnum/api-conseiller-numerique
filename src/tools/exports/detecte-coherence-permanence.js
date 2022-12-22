#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE', idPG: 52407 }).toArray();
  // const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE' }).toArray();
  let promises = [];
  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'conseiller-incoherence-permanence.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write('id du conseiller;Nom;Prenom;email @conseiller-numerique.fr;Détails\n');
  conseillers.forEach(cnfs => {
    promises.push(new Promise(async resolve => {
      // controle cohérence :
      let incoherenceHasPermenceTrue = 0; // sur le hasPermanence true en lien avec la collection
      let incoherenceHasPermenceFalse = 0; // sur le hasPermanence false en lien avec la collection
      let incoherenceLieuxPrincipaux = 0; // sur les Permanences "Principale" si ils ont au moins 1 permanence
      let incoherenceLieuxprincipauxItinerence = 0; // sur les Permanences "Principale avec la donnée itinérence
      let incoherenceArrayConseillers = 0; // sur les Permanences avec l'id du conseiller mais qui n'est pas présente dans l'array conseillers
      const queryPrincipal = {
        'conseillers': { '$in': [cnfs._id] },
        'lieuPrincipalPour': { '$in': [cnfs._id] }
      };

      const checkCountPermanences = await db.collection('permanences').countDocuments({ conseillers: { '$in': [cnfs._id] } });
      const checkLieuPrincipal = await db.collection('permanences').countDocuments(queryPrincipal);
      const checkItinerants = await db.collection('permanences').countDocuments({ ...queryPrincipal, 'conseillersItinerants': { '$in': [cnfs._id] } });
      const checkConseillers = await db.collection('permanences').countDocuments({
        'conseillers': { '$nin': [cnfs._id] },
        '$or': [
          { 'conseillersItinerants': { '$in': [cnfs._id] } },
          { 'lieuPrincipalPour': { '$in': [cnfs._id] } }
        ]
      });

      incoherenceHasPermenceTrue = (checkCountPermanences === 0 && cnfs?.hasPermanence === true) ? 'OUI' : 'NON';
      incoherenceHasPermenceFalse = (checkCountPermanences >= 1 && !cnfs?.hasPermanence) ? 'OUI' : 'NON';
      incoherenceLieuxPrincipaux = (checkCountPermanences >= 1 && checkLieuPrincipal === 0) ? 'OUI' : 'NON';
      incoherenceLieuxprincipauxItinerence = (checkCountPermanences >= 1 && checkItinerants >= 1) ? 'OUI' : 'NON';
      incoherenceArrayConseillers = (checkConseillers >= 1) ? 'OUI' : 'NON'; // si OUI => le checkCountPermanences ligne 43 sera OUI aussi

      const checkIncoherence = [
        incoherenceHasPermenceTrue,
        incoherenceHasPermenceFalse,
        incoherenceLieuxPrincipaux,
        incoherenceLieuxprincipauxItinerence,
        incoherenceArrayConseillers
      ];

      if (checkIncoherence.includes('OUI')) {
        file.write(`${cnfs.idPG};${cnfs.nom};${cnfs.prenom};${cnfs?.emailCN?.address};${checkIncoherence.join('/ ')}\n`);
        count++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Il y a ${count} conseiller(s) qui ont au moins 1 incohérence en lien avec les permanences / ${conseillers.length}`);
  file.close();
});
