const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const { NotFound, Conflict, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const dayjs = require('dayjs');
const Joi = require('joi');
const { jwtDecode } = require('jwt-decode');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const { Role } = require('../../common/utils/feathers.utils');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const checkRoleCandidat = (user, req) => {
  return user?.roles.includes('candidat') && req.params.id.toString() === user?.entity.oid.toString();
};
const checkRoleConseiller = (user, req) => {
  return user?.roles.includes('conseiller') && req.params.id.toString() === user?.entity.oid.toString();
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
  const client = new S3Client({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.access_key_id,
      secretAccessKey: awsConfig.secret_access_key,
    },
    endpoint: awsConfig.endpoint,
  });
  let params = { Bucket: awsConfig.cv_bucket, Key: conseiller.cv.file };

  const command = new GetObjectCommand(params);
  return await client.send(command);
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
              'statut': { $in: ['finalisee', 'recrutee', 'nouvelle_rupture'] }
            }).toArray();
          if (misesEnRelations.length !== 0) {
            const misesEnRelationsFinalisees = await db.collection('misesEnRelation').findOne(
              {
                'conseiller.$id': profil._id,
                'statut': { $in: ['finalisee', 'recrutee', 'nouvelle_rupture'] }
              });
            const statut = misesEnRelationsFinalisees.statut === 'recrutee' ? 'validée' : 'recrutée';
            const structure = await db.collection('structures').findOne({ _id: misesEnRelationsFinalisees.structure.oid });
            const idConvertString = JSON.stringify(profil._id);
            const messageDoublon = idConvertString === `"${id}"` ? `est ${statut} ` : `a un doublon qui est ${statut}`;
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
            res.status(409).send(new Conflict(`Le conseiller ${messageDoublonCoop} a un compte COOP d'activé`, {
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

const archiverLaSuppression = app => async (tableauCandidat, user, motif, actionUser, misesEnRelations) => {
  try {
    let promises = [];
    await app.get('mongoClient').then(async db => {
      tableauCandidat.forEach(profil => {
        promises.push(new Promise(async resolve => {
          try {
            const { ...conseiller } = profil;
            const objAnonyme = {
              deletedAt: new Date(),
              motif: motif,
              conseiller: conseiller,
              historiqueContrats: misesEnRelations.filter(miseEnRelation => String(miseEnRelation.conseillerId) === String(conseiller._id)),
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

const echangeUserCreation = app => async email => {
  const db = await app.get('mongoClient');
  await db.collection('conseillers').updateOne({ email, userCreated: false, userCreationError: true }, { $unset: { userCreationError: '' } });
};

const deleteMailSib = app => async emailPerso => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = app.get('sib_api_key');
    const apiInstance = new SibApiV3Sdk.ContactsApi();
    await apiInstance.deleteContact(emailPerso);
  } catch (error) {
    logger.error(`Erreur contact SIB : ${error.message}`);
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
  //initialisation AWS
    const awsConfig = app.get('aws');
    const client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.access_key_id,
        secretAccessKey: awsConfig.secret_access_key,
      },
      endpoint: awsConfig.endpoint,
    });

    //Suppression du fichier CV
    let paramsDelete = { Bucket: awsConfig.cv_bucket, Key: cv?.file };
    const command = new DeleteObjectCommand(paramsDelete);
    await client.send(command).then(async data => {
      resolve(data);
    }).catch(error => {
      logger.info(error);
      app.get('sentry').captureException(error);
      reject(error);
    });
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
    let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
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

const getConseillersListe = db => async (query, ordreNom, ordre, page, nbParpage) => {
  return await db.collection('conseillers')
  .find(query)
  .sort({ [ordreNom]: ordre })
  .skip(page > 0 ? ((page - 1) * nbParpage) : 0).limit(nbParpage).toArray();
};

const countConseillers = db => async query => {
  return await db.collection('conseillers').countDocuments(query);
};

const getConseillersByCoordinateurId = db => async (idCoordinateur, page, dateDebut, dateFin, filtreProfil, ordreNom, ordre, options) => {
  const coordinateur = await db.collection('conseillers').findOne({ '_id': idCoordinateur });
  let conseillers = {};
  if (coordinateur?.listeSubordonnes?.type) {
    let query = { };

    switch (filtreProfil) {
      case 'active':
        query = { 'statut': 'RECRUTE', 'mattermost.id': { $exists: true } };
        break;
      case 'inactive':
        query = { 'statut': 'RECRUTE', 'mattermost.id': { $exists: false } };
        break;
      default:
        query = { 'statut': 'RECRUTE' };
        break;
    }

    query.$or = [
      { datePrisePoste: { '$gte': dateDebut, '$lte': dateFin } },
      { datePrisePoste: null }
    ];

    switch (coordinateur.listeSubordonnes.type) {
      case 'conseillers':
        query._id = { '$in': coordinateur.listeSubordonnes.liste };
        break;
      case 'codeRegion':
        query.codeRegionStructure = { '$in': coordinateur.listeSubordonnes.liste };
        break;
      case 'codeDepartement':
        query.codeDepartementStructure = { '$in': coordinateur.listeSubordonnes.liste };
        break;
      default:
        break;
    }

    conseillers.data = await getConseillersListe(db)(query, ordreNom, ordre, page, Number(options.paginate.default));
    conseillers.total = await countConseillers(db)(query);
    conseillers.limit = options.paginate.default;
    conseillers.skip = Number(page);
  } else {
    conseillers.data = [];
    conseillers.total = 0;
    conseillers.limit = 0;
    conseillers.skip = 0;
  }

  return conseillers;
};

const countCraConseiller = db => async (conseillerId, dateDebut, dateFin) => {
  return await db.collection('cras').countDocuments({ 'conseiller.$id': conseillerId, 'createdAt': { '$gte': dateDebut, '$lte': dateFin } });
};

const isSubordonne = db => async (coordinateurId, conseillerId) => {
  const coordinateur = await db.collection('conseillers').findOne({ '_id': coordinateurId });
  const conseiller = await db.collection('conseillers').findOne({ '_id': conseillerId });

  let isSubordonne = false;
  switch (coordinateur?.listeSubordonnes?.type) {
    case 'conseillers':
      coordinateur?.listeSubordonnes?.liste.forEach(cons => {
        if (String(conseiller._id) === String(cons)) {
          isSubordonne = true;
        }
      });
      break;
    case 'codeDepartement':
      isSubordonne = coordinateur?.listeSubordonnes?.liste?.includes(conseiller.codeDepartement);
      break;
    case 'codeRegion':
      isSubordonne = coordinateur?.listeSubordonnes?.liste?.includes(conseiller.codeRegion);
      break;
    default:
      break;
  }

  return isSubordonne;
};

module.exports = {
  checkRoleCandidat,
  checkRoleConseiller,
  checkRoleAdminCoop,
  checkConseillerExist,
  checkCvExistsS3,
  checkConseillerHaveCV,
  suppressionCVConseiller,
  verificationRoleUser,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  echangeUserCreation,
  suppressionTotalCandidat,
  suppressionCv,
  checkFormulaire,
  checkRoleAdmin,
  candidatSupprimeEmailPix,
  getConseillersByCoordinateurId,
  countCraConseiller,
  isSubordonne,
  deleteMailSib
};
