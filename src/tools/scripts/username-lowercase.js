#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(async ({ db, logger, exit }) => {
  logger.info('Passes les noms d\'utilisateur en minuscule...');
  let count = 0;
  await db.collection('users').find({}, { 'name': 1 }).forEach(function(doc) {
    count++;
    db.collection('users').updateOne(
      { _id: doc._id },
      { $set: { 'name': doc.name.toLowerCase() } }
    );
  });
  logger.info(`${count} utilisateurs mis à jour`);
  exit();
});
