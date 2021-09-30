const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const { Conflict, NotAuthenticated, Forbidden } = require('@feathersjs/errors');

const verificationRoleAdmin = async (db, decode, req, res) => {
  const accessToken = req.feathers?.authentication?.accessToken;
  if (req.feathers?.authentication === undefined) {
    res.status(401).send(new NotAuthenticated('User not authenticated'));
    return;
  }
  let userId = decode(accessToken).sub;
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user?.roles.includes('admins')) {
    res.status(403).send(new Forbidden('User not authorized', {
      userId: userId
    }).toJSON());
    return;
  }
};
const verificationCandidaturesRecrutee = async (email, id, app, promises, res) => {
  try {
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promises.push(new Promise(async resolve => {
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
            const messageDoublon = profil._id === id ? `est ${statut} par` : `a un doublon qui est ${statut}`;
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
        }));
      });
      await Promise.allSettled(promises);
    });
  } catch (error) {
    logger.error(error);
    // app.get('sentry').captureException(error);
  }

};
module.exports = {
  verificationRoleAdmin,
  verificationCandidaturesRecrutee

};
