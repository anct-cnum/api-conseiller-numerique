#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const { execute } = require('../../../utils');

execute(__filename, async ({ db, logger, exit }) => {

  logger.info('Complète les données des mises en relations pour les filtres...');
  let count = 0;
  const misesEnRelation = await db.collection('misesEnRelation').find({ conseillerObj: null }).toArray();
  for (const idx in misesEnRelation) {
    const miseEnRelation = misesEnRelation[idx];
    const structureObj = await db.collection('structures').findOne({ _id: miseEnRelation.structure.oid });
    const conseillerObj = await db.collection('conseillers').findOne({ _id: miseEnRelation.conseiller.oid });
    await db.collection('misesEnRelation').updateOne({ _id: miseEnRelation._id }, { $set: { structureObj, conseillerObj } });
    count++;
  }
  logger.info(`${count} mises en relations mises à jours`);

  exit();
});
