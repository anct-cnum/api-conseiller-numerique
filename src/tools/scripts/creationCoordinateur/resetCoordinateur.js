#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Reset/Purge de tout les coordos....');
  // estCoordinateur
  await db.collection('conseillers').updateMany(
    { 'estCoordinateur': true },
    { $set: { 'estCoordinateur': false } },
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseillerObj.estCoordinateur': true },
    { $set: { 'conseillerObj.estCoordinateur': false } },
  );
  // listeSubordonnes
  await db.collection('conseillers').updateMany(
    { 'listeSubordonnes': { '$exists': true } },
    { $unset: { 'listeSubordonnes': '' } }
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseillerObj.listeSubordonnes': { '$exists': true } },
    { $unset: { 'conseillerObj.listeSubordonnes': '' } }
  );
  // Role
  await db.collection('users').updateMany(
    { 'roles': { '$in': ['coordinateur_coop'] } },
    { $pull: { 'roles': 'coordinateur_coop' } }
  );
  logger.info('Fin de la purge.');
  exit();
});