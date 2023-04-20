#!/usr/bin/env node
'use strict';
const dayjs = require('dayjs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db, Sentry }) => {

  const EXPIRATION_DATE_DEFAUT = new Date(dayjs(new Date()).subtract(30, 'month')); // RGPD 30 mois
  const EXPIRATION_DATE_ADMIN = new Date(dayjs(new Date()).subtract(12, 'month')); // Sécurité admin
  const WL_ROLE_ADMIN = ['structure', 'admin', 'prefet', 'hub_coop', 'grandReseau']; //structure en premier car traitement supplémentaire et multi rôle possible

  const queryInactiveAdmin = { $or: [
    // Cas 1 : Compte non activé - le token aura expiré
    {
      passwordCreated: false,
      createdAt: { $lte: EXPIRATION_DATE_ADMIN }
    },
    // CAS 2 : Compte activé mais inactif
    {
      passwordCreated: true,
      lastLogin: { $lte: EXPIRATION_DATE_ADMIN }
    },
    // CAS 3 : Compte activé mais jamais utilisé
    {
      passwordCreated: true,
      lastLogin: { $exists: false },
      createdAt: { $lte: EXPIRATION_DATE_ADMIN }
    },
  ] };

  const queryInactiveCandidat = { $or: [
    // Cas 1 : Compte non activé et token est expiré (28j rétention)
    {
      passwordCreated: false,
      lastLogin: { $exists: false },
      token: null,
      tokenCreatedAt: null,
      createdAt: { $lte: EXPIRATION_DATE_DEFAUT }
    },
    // Cas 1 BIS : Compte non activé (cas switch compte coop <--> candidat)
    {
      passwordCreated: false,
      lastLogin: { $lte: EXPIRATION_DATE_DEFAUT },
      token: null,
      tokenCreatedAt: null,
    },
    // CAS 2 : Compte activé, a été utilisé mais inactif
    {
      passwordCreated: true,
      lastLogin: { $lte: EXPIRATION_DATE_DEFAUT }
    },
    // CAS 3 : Compte a été activé mais jamais utilisé
    {
      passwordCreated: true,
      lastLogin: { $exists: false },
      createdAt: { $lte: EXPIRATION_DATE_DEFAUT }
    },
  ] };

  const expirationAccessLogs = async () => {
    const { deletedCount } = await db.collection('accessLogs').deleteMany({
      'createdAt': { $lte: EXPIRATION_DATE_DEFAUT }
    });
    logger.info(`Suppression de ${deletedCount} log(s) d'accès`);
  };

  const expirationAdminUsers = async role => {

    if (role === 'structure') {
      const structures = await db.collection('users').find({
        $and: [
          { roles: { $in: [role] } },
          queryInactiveAdmin
        ],
      }).toArray();

      // Flag inactivité contact mail principal uniquement (multi-compte possible)
      let promises = [];
      structures.forEach(userStructure => {
        promises.push(new Promise(async resolve => {
          const structure = await db.collection('structures').findOne({ _id: userStructure.entity.oid });
          if (structure.contact?.email === userStructure.name) {
            await db.collection('structures').updateOne({ _id: userStructure.entity.oid }, { $set: { 'contact.inactivite': true, 'userCreated': false } });
            await db.collection('misesEnRelation').updateMany(
              { 'structure.$id': userStructure.entity.oid },
              {
                $set: {
                  'structureObj.contact.inactivite': true,
                  'structureObj.userCreated': false,
                }
              }
            );
          }
          resolve();
        }));
      });
      await Promise.all(promises);
    }

    const { deletedCount } = await db.collection('users').deleteMany({
      $and: [
        { roles: { $in: [role] } },
        queryInactiveAdmin
      ],
    });
    logger.info(`Suppression de ${deletedCount} compte(s) ${role} inactif(s)`);
  };

  const expirationCandidatUsers = async () => {
    const candidats = await db.collection('users').find({
      $and: [
        { roles: { $in: ['candidat'] } },
        queryInactiveCandidat
      ],
    }).toArray();

    // Flag inactivité
    let promises = [];
    candidats.forEach(userCandidat => {
      promises.push(new Promise(async resolve => {
        // On cible par mail pour les doublons
        await db.collection('conseillers').updateMany({ email: userCandidat.name }, { $set: { inactivite: true, userCreated: false } });
        await db.collection('misesEnRelation').updateMany(
          { 'conseillerObj.email': userCandidat.name },
          {
            $set: {
              'conseillerObj.inactivite': true,
              'conseillerObj.userCreated': false,
            }
          }
        );
        resolve();
      }));
    });
    await Promise.all(promises);

    const { deletedCount } = await db.collection('users').deleteMany({
      $and: [
        { roles: { $in: ['candidat'] } },
        queryInactiveCandidat
      ],
    });

    logger.info(`Suppression de ${deletedCount} compte(s) candidat inactif(s)`);
  };

  try {
    await expirationAccessLogs();
    await expirationCandidatUsers();
    for (const r of WL_ROLE_ADMIN) {
      await expirationAdminUsers(r);
    }
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
  }
});
