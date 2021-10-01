const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const { Conflict, NotAuthenticated, Forbidden } = require('@feathersjs/errors');

const verificationRoleAdmin = async (userAuthentifier, db, decode, req, res) => {
  let promise;
  promise = new Promise(async resolve => {
    const accessToken = req.feathers?.authentication?.accessToken;
    if (req.feathers?.authentication === undefined) {
      res.status(401).send(new NotAuthenticated('User not authenticated'));
      return;
    }
    let userId = decode(accessToken).sub;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    userAuthentifier.push(user);
    if (!user?.roles.includes('admin')) {
      res.status(403).send(new Forbidden('User not authorized', {
        userId: userId
      }).toJSON());
      return;
    }
    resolve();
  });
  await promise;
};
const verificationCandidaturesRecrutee = async (email, id, app, res) => {
  try {
    let promise;
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promise = new Promise(async resolve => {
          //Pour vérifier qu'il n'a pas été validé ou recruté dans une quelconque structure
          const misesEnRelations = await db.collection('misesEnRelation').find(
            { 'conseiller.$id': profil._id,
              'statut': { $in: ['finalisee', 'recrutee'] }
            }).toArray();
          if (misesEnRelations.length !== 0) {
            const misesEnRelationsFinalisees = await db.collection('misesEnRelation').findOne(
              { 'conseiller.$id': profil._id,
                'statut': { $in: ['finalisee', 'recrutee'] }
              });
            const statut = misesEnRelationsFinalisees.statut === 'finalisee' ? 'recrutée' : 'validée';
            const structure = await db.collection('structures').findOne({ _id: misesEnRelationsFinalisees.structure.oid });
            const idConvertString = JSON.stringify(profil._id);
            const messageDoublon = idConvertString === `"${id}"` ? `est ${statut} par` : `a un doublon qui est ${statut}`;
            const messageSiret = structure?.siret ?? `non renseigné`;
            res.status(409).send(new Conflict(`Le conseiller ${messageDoublon} par la structure ${structure.nom}, SIRET: ${messageSiret}`).toJSON());
            return;
          }
          // Pour etre sure qu'il n'a pas d'espace COOP
          const usersCount = await db.collection('users').countDocuments(
            { 'entity.$id': profil._id,
              'roles': { $eq: ['conseiller'] }
            });

          if (usersCount >= 1) {
            const messageDoublonCoop = profil._id === id ? `` : `a un doublon qui`;
            res.status(409).send(new Conflict(`Le conseiller ${messageDoublonCoop} a un compte COOP d'activer`, {
              id
            }).toJSON());
            return;
          }
          resolve();
        });
      });
      await promise;
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }

};

const archiverLaSuppression = async (email, user, app, motif, actionUser) => {
  try {
    let promise;
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promise = new Promise(async resolve => {
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
            app.get('sentry').captureException(error);
          }
          resolve();
        });
      });
      await promise;
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }
};

const suppressionTotalCandidat = async (email, app) => {
  try {
    let promise;
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promise = new Promise(async resolve => {
          try {
            await pool.query(`
        DELETE FROM djapp_matching WHERE coach_id = $1`,
            [profil.idPG]);
            await pool.query(`
        DELETE FROM djapp_coach WHERE id = $1`,
            [profil.idPG]);
          } catch (error) {
            logger.info(error);
            app.get('sentry').captureException(error);
          }
          try {
            await db.collection('misesEnRelation').deleteMany({ 'conseiller.$id': profil._id });
            await db.collection('users').deleteOne({ 'entity.$id': profil._id });
            await db.collection('conseillers').deleteOne({ _id: profil._id });

          } catch (error) {
            logger.info(error);
            app.get('sentry').captureException(error);
          }
          resolve();
        });
      });
      await promise;
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }
};
module.exports = {
  verificationRoleAdmin,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  suppressionTotalCandidat
};
