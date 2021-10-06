#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
require('dotenv').config();
const dayjs = require('dayjs');
const pool = new Pool();

const { execute } = require('../utils');

const DATE = new Date('2021-01-01');

execute(__filename, async ({ app, db, logger, Sentry, exit }) => {
  logger.info(`Supprime les candidats qui n'ont pas choisi leur mot de passe depuis le ${dayjs(DATE).format('DD/MM/YYYY')}...`);
  let count = 0;
  let promises = [];

  const deleteConseillerPG = async id => {
    try {
      const row = await pool.query(`
        DELETE djapp_coach
        WHERE id = $1`,
      [id]);
      return row;
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const archiverLaSuppression = async ({ email, user, Sentry, motif, actionUser }) => {
    try {
      let promises = [];
      await app.get('mongoClient').then(async db => {
        await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
          promises.push(new Promise(async resolve => {
            try {
            // eslint-disable-next-line no-unused-vars
              const { email, telephone, nom, prenom, ...conseiller } = profil;
              const objAnonyme = {
                deletedAt: new Date(),
                motif: motif,
                conseiller: conseiller
              };
              if (actionUser === 'admin') {
                objAnonyme.actionUser = {
                  role: 'admin',
                  userId: user._id
                };
              } else {
                objAnonyme.actionUser = actionUser;
              }
              await db.collection('conseillersSupprimes').insertOne(objAnonyme);
            } catch (error) {
              logger.info(error);
              Sentry.captureException(error);
            }
            resolve();
          }));
        });
        await Promise.all(promises);
      });
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  };
  
  await db.collection('users').find({
    'roles': { $elemMatch: { '$eq': 'candidat' } },
    'passwordCreated': false
  }).forEach(async user => {
    promises.push(new Promise(async resolve => {
      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      
      if (conseiller.createdAt < DATE) {
        archiverLaSuppression({ email: conseiller.email, user, Sentry, motif: 'archivage', actionUser: 'script' });

        await db.collection('conseillers').deleteMany({ email: conseiller.email });
        await deleteConseillerPG(conseiller.idPG);
        await db.collection('misesEnRelation').deleteMany({ 'conseillerObj.email': conseiller.email });

        count++;
      }
      
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} candidats supprimés`);
  exit();
});
