#!/usr/bin/env node
'use strict';
const { execute } = require('../utils');

// node src/tools/scripts/fix-permanence-principale.js

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  let incoherenceLieuPrincipal = 0;
  let lieuxPrincipaleOk = 0;

  const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE', hasPermanence: true }).toArray();
  const countConseillers = await db.collection('conseillers').countDocuments({
    $or: [
      { statut: 'RECRUTE', hasPermanence: false },
      { statut: 'RECRUTE', hasPermanence: { $exists: false } }
    ] });

  logger.info(`Fix permanence principale...`);
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {

      const checkCountPermanences = await db.collection('permanences').countDocuments({ conseillers: { '$in': [conseiller._id] } });
      const checkLieuPrincipal = await db.collection('permanences').countDocuments({
        'conseillers': { '$in': [conseiller._id] },
        'lieuPrincipalPour': { '$in': [conseiller._id] }
      });
      if (checkCountPermanences >= 1 && checkLieuPrincipal === 0) {
        await db.collection('permanences').updateOne(
          { conseillers: { '$in': [conseiller._id] } },
          { $push: { 'lieuPrincipalPour': conseiller._id }
          });
        incoherenceLieuPrincipal++;
      } else if (checkCountPermanences >= 1 && checkLieuPrincipal >= 2) {
        // cas qui ne devrait pas y avoir !
        logger.error(`conseiller ${conseiller.idPG} a plus que 1 permanence principale`);
      } else {
        lieuxPrincipaleOk++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);


  logger.info(`Il y a ${conseillers.length + countConseillers} conseillers (RECRUTE)`);
  logger.info(`Il y a ${incoherenceLieuPrincipal} conseiller(s) n'ont pas de permanence principale / ${conseillers.length}`);
  logger.info(`Il y a ${lieuxPrincipaleOk} conseiller(s) qui ont bien une permanence principale / ${conseillers.length}`);
  logger.info(`Il y a ${countConseillers} conseiller(s) qui n'ont saisi aucune permanence`);
});
