#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { ObjectId } = require('mongodb');

// node src/tools/scripts/fix-idPermanence-inconnu.js

execute(__filename, async ({ logger, db, exit }) => {
  let crasPermanenceId = await db.collection('cras').distinct('permanence.$id', { 'permanence.$id': { '$ne': null } });
  let permanences = await db.collection('permanences').distinct('_id');

  crasPermanenceId = crasPermanenceId.map(id => String(id));
  permanences = permanences.map(id => String(id));

  logger.info(`${crasPermanenceId.length} idPermanences distincts dans les cras / ${permanences.length} idPermanences dans la collection permanence`);

  let idPermanences = crasPermanenceId.filter(i => !permanences.includes(i)); // liste IdPermanence inconnu

  idPermanences = idPermanences.map(id => new ObjectId(id));

  logger.info(`Correction des ${idPermanences.length} idPermanences inconnus...`);

  const countCras = await db.collection('cras').countDocuments({
    'permanence.$id': { '$in': idPermanences }
  });
  logger.info(`Il ${countCras} cras à modifier`);
  if (countCras >= 1) {
    await db.collection('cras').updateMany({
      'permanence.$id': { '$in': idPermanences }
    }, {
      $unset: { permanence: '' }
    });
    logger.info(`Modif pour ${countCras} cras => OK`);
  }
  exit();
});

