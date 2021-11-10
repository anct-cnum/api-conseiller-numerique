const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const { NotFound, Conflict, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const aws = require('aws-sdk');
const decode = require('jwt-decode');

const checkAuth = (req, res) => {
  if (req.feathers?.authentication === undefined) {
    res.status(401).send(new NotAuthenticated('User not authenticated'));
    return;
  }
};

const checkRoleCandidat = async (db, req, res) => {
  //Verification rôle candidat / structure / admin pour accéder au CV : si candidat alors il ne peut avoir accès qu'à son CV
  let userId = decode(req.feathers.authentication.accessToken).sub;
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  // eslint-disable-next-line max-len
  if (!(user?.roles.includes('candidat') && req.params.id.toString() === user?.entity.oid.toString())) {
    res.status(403).send(new Forbidden('User not authorized', {
      userId: userId
    }).toJSON());
    return;
  }
  return user;
};

const checkConseillerExist = async (db, id, user, res) => {
  //Verification existence du conseiller associé
  const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(id) });
  if (conseiller === null) {
    res.status(404).send(new NotFound('Conseiller not found', {
      conseillerId: user.entity.oid
    }).toJSON());
    return;
  }
  return conseiller;
};

const checkConseillerHaveCV = (conseiller, user, res) => {
  if (!conseiller.cv?.file) {
    res.status(404).send(new NotFound('CV not found for this conseiller', {
      conseillerId: user.entity.oid
    }).toJSON());
    return;
  }
};

const suppressionCVConseiller = (db, conseiller) => {
  return new Promise(async resolve => {
    await db.collection('conseillers').updateMany({ 'email': conseiller.email },
      { $unset: {
        cv: ''
      } });
    await db.collection('misesEnRelation').updateMany({ 'conseiller.email': conseiller.email },
      { $unset: {
        'conseillerObj.cv': ''
      } });
    resolve();
  });
};

const verificationRoleUser = async (userAuthentifier, db, decode, req, res, roles) => {
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
    if (roles.filter(role => user?.roles.includes(role)).length === 0) {
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
    let promises = [];
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promises.push(new Promise(async resolve => {
          //Pour vérifier qu'il n'a pas été validé ou recruté dans une quelconque structure
          const misesEnRelations = await db.collection('misesEnRelation').find(
            {
              'conseiller.$id': profil._id,
              'statut': { $in: ['finalisee', 'recrutee'] }
            }).toArray();
          if (misesEnRelations.length !== 0) {
            const misesEnRelationsFinalisees = await db.collection('misesEnRelation').findOne(
              {
                'conseiller.$id': profil._id,
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
            {
              'entity.$id': profil._id,
              'roles': { $eq: ['conseiller'] }
            });

          if (usersCount >= 1) {
            const idConvertString = JSON.stringify(profil._id);
            const messageDoublonCoop = idConvertString === `"${id}"` ? `` : `a un doublon qui`;
            res.status(409).send(new Conflict(`Le conseiller ${messageDoublonCoop} a un compte COOP d'activer`, {
              id
            }).toJSON());
            return;
          }
          resolve();
        }));
      });
      await Promise.all(promises);
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }

};

const archiverLaSuppression = async (email, user, app, motif, actionUser) => {
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
            app.get('sentry').captureException(error);
          }
          resolve();
        }));
      });
      await Promise.all(promises);
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }
};

const suppressionTotalCandidat = async (email, app) => {
  try {
    let promises = [];
    await app.get('mongoClient').then(async db => {
      await db.collection('conseillers').find({ 'email': email }).forEach(profil => {
        promises.push(new Promise(async resolve => {
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
        }));
      });
      await Promise.all(promises);
    });
  } catch (error) {
    logger.error(error);
    app.get('sentry').captureException(error);
  }
};

const suppressionCv = async (cv, app) => {
  let promise;
  promise = new Promise(async (resolve, reject) => {
    try {
      //initialisation AWS
      const awsConfig = app.get('aws');
      aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
      const ep = new aws.Endpoint(awsConfig.endpoint);
      const s3 = new aws.S3({ endpoint: ep });

      //Suppression du fichier CV
      let paramsDelete = { Bucket: awsConfig.cv_bucket, Key: cv?.file };
      s3.deleteObject(paramsDelete, function(error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    } catch (error) {
      logger.info(error);
      app.get('sentry').captureException(error);
    }
  });
  await promise;
};
const checkRoleAdmin = async (db, req, res) => {
  return new Promise(async resolve => {
    let userId = decode(req.feathers.authentication.accessToken).sub;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (user?.roles.filter(role => ['admin'].includes(role)).length < 1) {
      res.status(403).send(new Forbidden('User not authorized', {
        userId
      }).toJSON());
      return;
    }
    resolve();
  });
};
module.exports = {
  checkAuth,
  checkRoleCandidat,
  checkConseillerExist,
  checkConseillerHaveCV,
  suppressionCVConseiller,
  verificationRoleUser,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  suppressionTotalCandidat,
  suppressionCv,
  checkRoleAdmin
};
