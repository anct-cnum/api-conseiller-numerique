#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const result = await db.collection('cras').updateMany({ 'cra.nbParticipants': null }, { $set: { 'cra.nbParticipants': 1 } });
  logger.info(`${result.modifiedCount} CRAs mis à jour`);
});
