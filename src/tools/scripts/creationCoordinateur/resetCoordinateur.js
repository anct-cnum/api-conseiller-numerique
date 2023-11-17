#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Reset/Purge de tout les coordos....');
  // estCoordinateur
  await db.collection('conseillers').updateMany(
    { 'estCoordinateur': true },
    { $unset: { 'estCoordinateur': '' } },
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseillerObj.estCoordinateur': true },
    { $unset: { 'conseillerObj.estCoordinateur': false } },
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
  // tag coordinateurs
  await db.collection('conseillers').updateMany(
    { 'coordinateurs': { '$exists': true } },
    { $unset: { 'coordinateurs': '' } }
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseillerObj.coordinateurs': { '$exists': true } },
    { $unset: { 'conseillerObj.coordinateurs': '' } }
  );
  // Role
  await db.collection('users').updateMany(
    { 'roles': { '$in': ['coordinateur_coop'] } },
    { $pull: { 'roles': 'coordinateur_coop' } }
  );
  logger.info('Fin de la purge.');
  exit();
});
