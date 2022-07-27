#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Correction des structures "faux fantôme"');

  let promises = [];
  let countCorrection = 0;
  let countOk = 0;
  let countError = 0;

  await db.collection('users').find(
    { roles: { $in: ['structure'] }, passwordCreated: false }
  ).forEach(async user => {
    promises.push(new Promise(async resolve => {
      try {
        const nombreMiseEnRelation = await db.collection('misesEnRelation').countDocuments({
          'structure.$id': user.entity.oid,
          'statut': { $in: ['interessee', 'recrutee', 'finalisee', 'nonInteressee', 'finalisee_rupture', 'nouvelle_rupture']
          } }
        );
        const structureEmailContact = await db.collection('structures').countDocuments({
          '_id': user.entity.oid,
          'contact.email': user.name
        });
        if (nombreMiseEnRelation > 0) {
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { passwordCreated: true } }
          );
          countCorrection++;
          //condition pour logger les users qui sont considéré 'multicompte' ou compte 'principal'
          // eslint-disable-next-line max-len
          logger.info(`La structure id=${user.entity.oid} avec le compte user id=${user._id} est considéré comme "faux fantôme" (${structureEmailContact === 0 ? 'Multicompte' : 'Principal'})`);
        } else {
          countOk++;
        }
      } catch (error) {
        logger.error(error);
        Sentry.captureException(error);
        countError++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);

  logger.info(`${countCorrection} structures faux fantomes corrigé(s) et ${countOk} structures en "vrai fantomes" et ${countError} en erreur`);
  exit();
});
