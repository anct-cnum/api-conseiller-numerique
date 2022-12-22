#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE' }).toArray();
  let promises = [];
  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'conseiller-incoherence-permanence.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write('id du conseiller; Nom; Prenom;email @conseiller-numerique.fr;Détails\n');
  conseillers.forEach(cnfs => {
    promises.push(new Promise(async resolve => {
      // controle cohérence :
      let coherenceHasPermenceTrue = 0; // sur le hasPermanence true en lien avec la collection
      let coherenceHasPermenceFalse = 0; // sur le hasPermanence false en lien avec la collection
      let coherenceLieuxprincipale = 0; // sur les Permanences "Principale" si ils ont au moins 1 permanence
      let coherenceLieuxprincipaleItinerence = 0; // sur les Permanences "Principale avec la donnée itinérence
      let coherenceArrayConseillers = 0; // sur les Permanences avec l'id du conseiller mais qui n'est pas présente dans l'array conseillers
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

      coherenceHasPermenceTrue = (checkCountPermanences === 0 && cnfs?.hasPermanence === true) ? 'OUI' : 'NON';
      coherenceHasPermenceFalse = (checkCountPermanences >= 1 && !cnfs?.hasPermanence) ? 'OUI' : 'NON';
      coherenceLieuxprincipale = (checkCountPermanences >= 1 && checkLieuPrincipal === 0) ? 'OUI' : 'NON';
      coherenceLieuxprincipaleItinerence = (checkCountPermanences >= 1 && checkItinerants >= 1) ? 'OUI' : 'NON';
      coherenceArrayConseillers = (checkConseillers >= 1) ? 'OUI' : 'NON';

      const checkCoherence = [
        coherenceHasPermenceTrue,
        coherenceHasPermenceFalse,
        coherenceLieuxprincipale,
        coherenceLieuxprincipaleItinerence,
        coherenceArrayConseillers
      ];

      if (checkCoherence.includes('OUI')) {
        // eslint-disable-next-line max-len
        file.write(`${cnfs.idPG};${cnfs.nom};${cnfs.prenom};${cnfs?.emailCN?.address};${checkCoherence.join('/ ')}\n`);
        count++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Il y a ${count} conseiller(s) qui ont au moins 1 incohérence en lien avec les permanences / ${conseillers.length}`);
  file.close();
});
