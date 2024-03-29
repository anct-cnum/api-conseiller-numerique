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
  file.write('id du conseiller;Nom;Prenom;email @conseiller-numerique.fr;Détails\n');
  conseillers.forEach(cnfs => {
    promises.push(new Promise(async resolve => {
      // controle incohérence :
      let incoherenceHasPermenceTrue = 0; // sur le hasPermanence true en lien avec la collection
      let incoherenceHasPermenceFalse = 0; // sur le hasPermanence false en lien avec la collection
      let incoherenceLieuPrincipaux = 0; // sur les Permanences "Principale" si ils ont au moins 1 permanence
      let incoherenceLieuPrincipauxItinerance = 0; // sur les Permanences "Principale avec la donnée itinérence
      let incoherenceArrayConseillers = 0; // sur les Permanences avec l'id du conseiller mais qui n'est pas présente dans l'array conseillers
      let incoherenceLocationNull = 0; //  ceux qui ont une adresse mais pas de coordonnées de trouvé (location à null)
      let incoherenceAccesStructureHoraire = 0; // sur les accès au public ("libre", "rdv") mais que des horaires "Fermé"

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
      const checkLocationNull = await db.collection('permanences').countDocuments({
        'conseillers': { '$in': [cnfs._id] },
        'location': null
      });
      const checkHoraireTypeAccess = await db.collection('permanences').countDocuments({
        'conseillers': { '$in': [cnfs._id] },
        'typeAcces': { '$in': ['libre', 'rdv'] },
        '$or': [
          { 'horaires': {
            $elemMatch: {
              matin: {
                $ne: ['Fermé', 'Fermé']
              }
            }
          } },
          { 'horaires': {
            $elemMatch: {
              apresMidi: {
                $ne: ['Fermé', 'Fermé']
              }
            }
          } }
        ]
      });
      incoherenceHasPermenceTrue = (checkCountPermanences === 0 && cnfs?.hasPermanence === true) ? 'OUI' : 'NON';
      incoherenceHasPermenceFalse = (checkCountPermanences >= 1 && !cnfs?.hasPermanence) ? 'OUI' : 'NON';
      incoherenceLieuPrincipaux = (checkCountPermanences >= 1 && checkLieuPrincipal === 0) ? 'OUI' : 'NON';
      incoherenceLieuPrincipauxItinerance = (checkCountPermanences >= 1 && checkItinerants >= 1) ? 'OUI' : 'NON';
      incoherenceArrayConseillers = (checkConseillers >= 1) ? 'OUI' : 'NON'; // si OUI => le checkCountPermanences ligne 43 sera OUI aussi
      incoherenceLocationNull = (checkLocationNull >= 1) ? 'OUI' : 'NON';
      incoherenceAccesStructureHoraire = (checkHoraireTypeAccess === 0) ? 'OUI' : 'NON'; // si c'est OUI cela veut dire que c'est complétement fermé

      const checkIncoherence = [
        incoherenceHasPermenceTrue,
        incoherenceHasPermenceFalse,
        incoherenceLieuPrincipaux,
        incoherenceLieuPrincipauxItinerance,
        incoherenceArrayConseillers,
        incoherenceLocationNull,
        incoherenceAccesStructureHoraire
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
