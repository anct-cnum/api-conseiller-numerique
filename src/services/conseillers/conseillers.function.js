const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const { NotFound, Conflict, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const aws = require('aws-sdk');
const dayjs = require('dayjs');
const Joi = require('joi');
const decode = require('jwt-decode');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const { Role } = require('../../common/utils/feathers.utils');

const checkAuth = (req, res) => {
  if (req.feathers?.authentication === undefined) {
    res.status(401).send(new NotAuthenticated('User not authenticated'));
    return;
  }
};

const checkRoleCandidat = (user, req) => {
  return user?.roles.includes('candidat') && req.params.id.toString() === user?.entity.oid.toString();
};

const checkRoleAdminCoop = user => {
  return user?.roles.includes(Role.AdminCoop);
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

const checkConseillerHaveCV = conseiller => {
  return !!conseiller.cv?.file;
};

const suppressionCVConseiller = (db, conseiller) => {
  return new Promise(async resolve => {
    await db.collection('conseillers').updateMany({ 'email': conseiller.email },
      { $unset: {
        cv: ''
      } });
    await db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': conseiller.email },
      { $unset: {
        'conseillerObj.cv': ''
      } });
    resolve();
  });
};

const checkCvExistsS3 = app => async conseiller => {
  //initialisation AWS
  const awsConfig = app.get('aws');
  aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
  const ep = new aws.Endpoint(awsConfig.endpoint);
  const s3 = new aws.S3({ endpoint: ep });
  let params = { Bucket: awsConfig.cv_bucket, Key: conseiller.cv.file };
  await s3.getObject(params).promise();
};

const verificationRoleUser = (db, decode, req, res) => async roles => {
  return new Promise(async resolve => {
    const accessToken = req.feathers?.authentication?.accessToken;
    if (req.feathers?.authentication === undefined) {
      res.status(401).send(new NotAuthenticated('User not authenticated'));
      return;
    }
    let userId = decode(accessToken).sub;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (roles.filter(role => user?.roles.includes(role)).length === 0) {
      res.status(403).send(new Forbidden('Vous n\'avez pas l\'autorisation', {
        userId: userId
      }).toJSON());
      return;
    }
    resolve(user);
  });
};
const verificationCandidaturesRecrutee = (app, res) => async (tableauCandidat, id) => {
  try {
    let promises = [];
    await app.get('mongoClient').then(async db => {
      tableauCandidat.forEach(profil => {
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

const archiverLaSuppression = app => async (tableauCandidat, user, motif, actionUser) => {
  try {
    let promises = [];
    await app.get('mongoClient').then(async db => {
      tableauCandidat.forEach(profil => {
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

const suppressionTotalCandidat = app => async tableauCandidat => {
  try {
    let promises = [];
    await app.get('mongoClient').then(async db => {
      tableauCandidat.forEach(profil => {
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

const checkFormulaire = body => {

  const minDate = dayjs().subtract(99, 'year');
  const maxDate = dayjs().subtract(18, 'year');

  return Joi.object({
    dateDeNaissance: Joi.date().required().min(minDate).max(maxDate).error(new Error('La date de naissance est invalide')),
    sexe: Joi.string().required().error(new Error('Le sexe est invalide')),
  }).validate(body);

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

const candidatSupprimeEmailPix = (db, app) => async candidat => {
  const mailer = createMailer(app);
  const emails = createEmails(db, mailer, app, logger);
  const emailPix = emails.getEmailMessageByTemplateName('candidatSupprimePix');
  await emailPix.send(candidat);
};

module.exports = {
  checkAuth,
  checkRoleCandidat,
  checkRoleAdminCoop,
  checkConseillerExist,
  checkCvExistsS3,
  checkConseillerHaveCV,
  suppressionCVConseiller,
  verificationRoleUser,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  suppressionTotalCandidat,
  suppressionCv,
  checkFormulaire,
  checkRoleAdmin,
  candidatSupprimeEmailPix
};
