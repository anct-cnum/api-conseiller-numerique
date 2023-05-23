const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, GeneralError, NotAuthenticated, Forbidden, BadRequest } = require('@feathersjs/errors');
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const decode = require('jwt-decode');
const aws = require('aws-sdk');
const multer = require('multer');
const fileType = require('file-type');
const { Pool } = require('pg');
const pool = new Pool();
const crypto = require('crypto');
const statsPdf = require('../stats/stats.pdf');
const dayjs = require('dayjs');
const Joi = require('joi');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const {
  checkAuth,
  checkRoleCandidat,
  checkRoleAdminCoop,
  checkConseillerExist,
  checkCvExistsS3,
  checkConseillerHaveCV,
  verificationRoleUser,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  suppressionTotalCandidat,
  suppressionCv,
  suppressionCVConseiller,
  checkRoleAdmin,
  candidatSupprimeEmailPix,
  getConseillersByCoordinateurId,
  countCraConseiller,
  isSubordonne,
  deleteMailSib } = require('./conseillers.function');
const {
  canActivate,
  authenticationGuard,
  authenticationFromRequest,
  rolesGuard,
  userIdFromRequestJwt,
  idSubordonne,
  Role,
  schemaGuard,
  abort,
  csvFileResponse, existGuard
} = require('../../common/utils/feathers.utils');
const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const statsCras = require('../stats/cras');
const { exportStatistiquesRepository } = require('./export-statistiques/repositories/export-statistiques.repository');
const {
  getExportStatistiquesFileName,
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema
} = require('./export-statistiques/utils/export-statistiques.utils');
const { buildExportStatistiquesCsvFileContent } = require('../../common/document-templates/statistiques-accompagnement-csv/statistiques-accompagnement-csv');
const { buildExportStatistiquesExcelFileContent
} = require('../../common/document-templates/statistiques-accompagnement-excel/statistiques-accompagnement-excel');
const { geolocatedConseillers, geolocatedStructure, geolocatedPermanence } = require('./geolocalisation/core/geolocalisation.core');
const { geolocationRepository } = require('./geolocalisation/repository/geolocalisation.repository');
const { createSexeAgeBodyToSchema, validateCreateSexeAgeSchema, conseillerGuard } = require('./create-sexe-age/utils/create-sexe-age.util');
const { countConseillersDoubles, setConseillerSexeAndDateDeNaissance } = require('./create-sexe-age/repositories/conseiller.repository');
const { geolocatedConseillersByRegion } = require('./geolocalisation/core/geolocation-par-region.core');
const { geolocatedConseillersByDepartement } = require('./geolocalisation/core/geolocation-par-departement.core');
const { permanenceRepository } = require('./permanence/repository/permanence.repository');
const { permanenceDetailsFromStructureId, permanenceDetails, aggregationByLocation } = require('./permanence/core/permanence-details.core');

const codeRegions = require('../../../data/imports/code_region.json');
const codeDepartements = require('../../../data/imports/departements-region.json');

exports.Conseillers = class Conseillers extends Service {
  constructor(options, app) {
    super(options);

    let db;
    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
    });

    const upload = multer();

    app.get('mongoClient').then(db => {
      this.Model = db.collection('conseillers');
    });

    app.get('/conseillers/verifyCandidateToken/:token', async (req, res) => {
      const token = req.params.token;
      const conseillers = await this.find({
        query: {
          emailConfirmationKey: token,
          $limit: 1,
        }
      });

      if (conseillers.total === 0) {
        res.status(404).send(new NotFound('Conseiller not found', {
          token
        }).toJSON());
        return;
      }

      res.send({ isValid: true, conseiller: conseillers.data[0] });
    });

    app.get('/conseillers/verifySondageToken/:token', async (req, res) => {
      const token = req.params.token;
      const conseillers = await this.find({
        query: {
          sondageToken: token,
          $limit: 1,
        }
      });

      if (conseillers.total === 0) {
        res.status(404).send(new NotFound('Désolé mais le lien est invalide.', {
          token
        }).toJSON());
        return;
      }

      const sondage = new Promise(async resolve => {
        const p = new Promise(async resolve => {
          app.get('mongoClient').then(db => {
            let sondage = db.collection('sondages').countDocuments(
              {
                'conseiller.$id': conseillers.data[0]._id
              });
            resolve(sondage);
          });
        });
        resolve(p);
      });
      const result = await sondage;
      if (result > 0) {
        res.status(409).send(new NotFound('Sondage déjà répondu.', {
          token
        }).toJSON());
        return;
      }

      res.send({ isValid: true, conseiller: conseillers.data[0] });
    });

    app.post('/conseillers/createSexeAge', async (req, res) => {
      const db = await app.get('mongoClient');
      const query = createSexeAgeBodyToSchema(req.body);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const conseillerId = user.entity.oid;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller, Role.Candidat], () => user),
        schemaGuard(validateCreateSexeAgeSchema(query)),
        conseillerGuard(conseillerId, countConseillersDoubles(db))
      ).then(async () => {
        await setConseillerSexeAndDateDeNaissance(db)(conseillerId, query.sexe, query.dateDeNaissance).then(() => {
          res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('La mise à jour a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.post('/conseillers/cv', upload.single('file'), async (req, res) => {
      checkAuth(req, res);

      //Verification role candidat
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const candidatUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!candidatUser?.roles.includes('candidat')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }

      const cvFile = req.file;
      if (cvFile === undefined) {
        res.status(400).send(new BadRequest('Erreur : cv non envoyé').toJSON());
        return;
      }
      //verification type PDF (ne pas faire confiance qu'au mime/type envoyé)
      const allowedExt = ['pdf'];
      const allowedMime = ['application/pdf'];
      let detectingFormat = await fileType.fromBuffer(cvFile.buffer);

      if (!allowedExt.includes(detectingFormat.ext) || !allowedMime.includes(cvFile.mimetype) || !allowedMime.includes(detectingFormat.mime)) {
        res.status(400).send(new BadRequest('Erreur : format de CV non autorisé').toJSON());
        return;
      }

      //Verification taille CV (limite configurée dans variable env cv_file_max_size)
      let sizeCV = ~~(cvFile.size / (1024 * 1024)); //convertion en Mo
      if (sizeCV >= app.get('cv_file_max_size')) {
        res.status(400).send(new BadRequest('Erreur : Taille du CV envoyé doit être inférieure à ' + app.get('cv_file_max_size') + ' Mo').toJSON());
        return;
      }

      //Nom du fichier avec id conseiller + extension fichier envoyé
      let nameCVFile = candidatUser.entity.oid + '.' + detectingFormat.ext;

      //Vérification existance conseiller avec cet ID pour sécurité
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(candidatUser.entity.oid) });
      if (conseiller === null) {
        res.status(404).send(new NotFound('Conseiller not found', {
          conseillerId: candidatUser.entity.oid
        }).toJSON());
        return;
      }

      //Chiffrement du CV
      const cryptoConfig = app.get('crypto');
      let key = crypto.createHash('sha256').update(cryptoConfig.key).digest('base64').substr(0, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(cryptoConfig.algorithm, key, iv);
      const bufferCrypt = Buffer.concat([iv, cipher.update(cvFile.buffer), cipher.final()]);

      //initialisation AWS
      const awsConfig = app.get('aws');
      aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
      const ep = new aws.Endpoint(awsConfig.endpoint);
      const s3 = new aws.S3({ endpoint: ep });

      //Suppression de l'ancien CV si présent dans S3 et dans MongoDb
      if (conseiller.cv?.file) {
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'cv.suppressionEnCours': true } });
        let paramsDelete = { Bucket: awsConfig.cv_bucket, Key: conseiller.cv.file };
        // eslint-disable-next-line no-unused-vars
        s3.deleteObject(paramsDelete, function(error, data) {
          if (error) {
            logger.error(error);
            app.get('sentry').captureException(error);
            res.status(500).send(new GeneralError('La suppression du cv a échoué.').toJSON());
          }
        });

        try {
          await suppressionCVConseiller(db, conseiller);
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('La suppression du CV dans MongoDb a échoué').toJSON());
        }
      }

      let params = { Bucket: awsConfig.cv_bucket, Key: nameCVFile, Body: bufferCrypt };
      // eslint-disable-next-line no-unused-vars
      s3.putObject(params, function(error, data) {
        if (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          res.status(500).send(new GeneralError('Le dépôt du cv a échoué, veuillez réessayer plus tard.').toJSON());
        } else {
          //Insertion du cv dans MongoDb
          try {
            const cv = {
              file: nameCVFile,
              extension: detectingFormat.ext,
              date: new Date()
            };

            db.collection('conseillers').updateMany({ email: conseiller.email },
              {
                $set: {
                  cv: cv
                }
              });
            db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': conseiller.email },
              {
                $set: {
                  'conseillerObj.cv': cv
                }
              });
          } catch (error) {
            app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).send(new GeneralError('La mise à jour du CV dans MongoDB a échoué').toJSON());
          }

          res.send({ isUploaded: true });
        }
      });
    });

    app.delete('/conseillers/:id/cv', async (req, res) => {
      checkAuth(req, res);
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!checkRoleCandidat(user, req)) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }
      const conseiller = await checkConseillerExist(db, req.params.id, user, res);

      if (!checkConseillerHaveCV(conseiller)) {
        res.status(404).send(new NotFound('CV not found for this conseiller', {
          conseillerId: user.entity.oid
        }).toJSON());
        return;
      }
      try {
        await checkCvExistsS3(app)(conseiller);
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'cv.suppressionEnCours': true } });
        await suppressionCv(conseiller.cv, app);
        await suppressionCVConseiller(db, conseiller);
        return res.send({ deleteSuccess: true });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de la suppression du CV').toJSON());
      }
    });

    app.get('/conseillers/:id/cv', async (req, res) => {
      checkAuth(req, res);

      //Verification rôle candidat / structure / admin pour accéder au CV : si candidat alors il ne peut avoir accès qu'à son CV
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      // eslint-disable-next-line max-len
      if (!(user?.roles.includes('candidat') && req.params.id.toString() === user?.entity.oid.toString()) && !user?.roles.includes('structure') && !user?.roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }

      //Verification existence du conseiller associé
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(req.params.id) });
      if (conseiller === null) {
        res.status(404).send(new NotFound('Conseiller not found', {
          conseillerId: user.entity.oid
        }).toJSON());
        return;
      }

      //Verification existence CV du conseiller
      if (!conseiller.cv?.file) {
        res.status(404).send(new NotFound('Le CV du conseiller n\'existe plus', {
          conseillerId: user.entity.oid
        }).toJSON());
        return;
      }

      //Récupération du CV crypté
      const awsConfig = app.get('aws');
      aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
      const ep = new aws.Endpoint(awsConfig.endpoint);
      const s3 = new aws.S3({ endpoint: ep });

      let params = { Bucket: awsConfig.cv_bucket, Key: conseiller.cv.file };/*  */
      s3.getObject(params, function(error, data) {
        if (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          res.status(500).send(new GeneralError('La récupération du cv a échoué.').toJSON());
        } else {
          //Dechiffrement du CV (le buffer se trouve dans data.Body)
          const cryptoConfig = app.get('crypto');
          let key = crypto.createHash('sha256').update(cryptoConfig.key).digest('base64').substr(0, 32);
          const iv = data.Body.slice(0, 16);
          data.Body = data.Body.slice(16);
          const decipher = crypto.createDecipheriv(cryptoConfig.algorithm, key, iv);
          const bufferDecrypt = Buffer.concat([decipher.update(data.Body), decipher.final()]);

          res.send(bufferDecrypt);
        }
      });
    });

    app.get('/conseillers/:id/statistiques.pdf', async (req, res) => {

      app.get('mongoClient').then(async db => {

        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        let userId = decode(accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        const rolesAllowed = [Role.Conseiller, Role.AdminCoop, Role.StructureCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => user?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const dateDebut = dayjs(req.query.dateDebut).format('YYYY-MM-DD');
        const dateFin = dayjs(req.query.dateFin).format('YYYY-MM-DD');
        const codePostal = req.query?.codePostal ? req.query.codePostal : 'null';
        const ville = req.query?.ville ? req.query.ville : 'null';
        user.role = user.roles[0];
        user.pdfGenerator = true;
        delete user.roles;
        delete user.password;

        const schema = Joi.object({
          dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
          dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
          codePostal: Joi.required().error(new Error('Le code postal est invalide')),
          ville: Joi.required().error(new Error('La ville est invalide')),
        }).validate(req.query);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        let finUrl = '/conseiller/' + user.entity.oid + '/' + dateDebut + '/' + dateFin + '/' + codePostal + '/' + ville;

        /** Ouverture d'un navigateur en headless afin de générer le PDF **/
        try {
          await statsPdf.generatePdf(app, res, logger, accessToken, user, finUrl);
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(500).send(new GeneralError('Une erreur est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
        }

        return;
      });
    });

    app.get('/conseillers/statistiques.csv', async (req, res) => {
      const db = await app.get('mongoClient');
      const query = exportStatistiquesQueryToSchema(req.query);
      const getUserById = userAuthenticationRepository(db);
      const userId = userIdFromRequestJwt(req);
      const conseillerSubordonne = idSubordonne(req);
      let conseiller = {};
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Conseiller, Role.Coordinateur], getUserById),
        schemaGuard(validateExportStatistiquesSchema(query))
      ).then(async () => {
        const userById = await getUserById(userId);
        const { getConseillerAssociatedWithUser, getCoordinateur, getConseiller } = exportStatistiquesRepository(db);
        if (conseillerSubordonne !== null) {
          conseiller = await getCoordinateur(userById, conseillerSubordonne) ?
            await getConseiller(conseillerSubordonne) : await getConseillerAssociatedWithUser(userById);
        } else {
          conseiller = await getConseillerAssociatedWithUser(userById);
        }
        let dateFin = new Date(query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        let statsQuery = {
          'conseiller.$id': conseiller._id,
          'cra.dateAccompagnement': { $gte: query.dateDebut, $lt: dateFin }
        };
        if (query.codePostal !== '') {
          statsQuery = {
            ...statsQuery,
            'cra.codePostal': req.query?.codePostal
          };
        }
        if (query.ville !== '') {
          statsQuery = {
            ...statsQuery,
            'cra.nomCommune': req.query?.ville
          };
        }
        const isAdminCoop = checkRoleAdminCoop(userById);
        const stats = await statsCras.getStatsGlobales(db, statsQuery, statsCras, isAdminCoop);

        csvFileResponse(res,
          `${getExportStatistiquesFileName(query.dateDebut, dateFin)}.csv`,
          // eslint-disable-next-line max-len
          buildExportStatistiquesCsvFileContent(stats, query.dateDebut, dateFin, `${conseiller.prenom} ${conseiller.nom}`, query.idType, query.codePostal, query.ville, isAdminCoop)
        );
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/conseillers/statistiques.xlsx', async (req, res) => {
      const db = await app.get('mongoClient');
      const query = exportStatistiquesQueryToSchema(req.query);
      const getUserById = userAuthenticationRepository(db);
      const userId = userIdFromRequestJwt(req);
      const conseillerSubordonne = idSubordonne(req);
      let conseiller = {};
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Conseiller, Role.Coordinateur], getUserById),
        schemaGuard(validateExportStatistiquesSchema(query))
      ).then(async () => {
        const userById = await getUserById(userId);
        const { getConseillerAssociatedWithUser, getCoordinateur, getConseiller } = exportStatistiquesRepository(db);
        if (conseillerSubordonne !== null) {
          conseiller = await getCoordinateur(userById, conseillerSubordonne) ?
            await getConseiller(conseillerSubordonne) : await getConseillerAssociatedWithUser(userById);
        } else {
          conseiller = await getConseillerAssociatedWithUser(userById);
        }
        let dateFin = new Date(query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        let statsQuery = {
          'conseiller.$id': conseiller._id,
          'cra.dateAccompagnement': { $gte: query.dateDebut, $lt: dateFin }
        };
        if (query?.codePostal !== '') {
          statsQuery = {
            ...statsQuery,
            'cra.codePostal': query?.codePostal
          };
        }
        if (query?.ville !== '') {
          statsQuery = {
            ...statsQuery,
            'cra.nomCommune': query?.ville
          };
        }
        const isAdminCoop = checkRoleAdminCoop(userById);
        const stats = await statsCras.getStatsGlobales(db, statsQuery, statsCras, isAdminCoop);

        buildExportStatistiquesExcelFileContent(
          app, res, stats, query?.dateDebut, dateFin,
          `${conseiller?.prenom} ${conseiller?.nom}`,
          query?.idType, query?.codePostal, query?.ville,
          isAdminCoop
        );
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/conseillers/:id/employeur', async (req, res) => {
      checkAuth(req, res);

      const accessToken = req.feathers?.authentication?.accessToken;

      let userId = decode(accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user?.roles.includes('admin') && !user?.roles.includes('prefet')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }

      const id = req.params.id;
      const conseillers = await this.find({
        query: {
          _id: id,
          $limit: 1,
        }
      });

      if (conseillers.total === 0) {
        res.status(404).send(new NotFound('Conseiller not found', {
          id
        }).toJSON());
        return;
      }

      const miseEnRelation = await db.collection('misesEnRelation').findOne({
        'conseiller.$id': new ObjectId(id),
        'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
      });

      if (miseEnRelation === null) {
        res.status(404).send(new NotFound('Structure not found', {
          id
        }).toJSON());
        return;
      }
      res.send({ nomStructure: miseEnRelation.structureObj.nom });
    });

    app.delete('/conseillers/:id/candidature', async (req, res) => {
      const roles = ['admin', 'candidat'];
      let user;
      const actionUser = req.query.actionUser;
      const id = req.params.id;
      const motif = req.query.motif;
      const conseiller = await this.find({
        query: {
          _id: new ObjectId(id),
          $limit: 1,
        }
      });
      if (conseiller.total === 0) {
        res.status(404).send(new NotFound('Conseiller non trouvé', {
          id
        }).toJSON());
        return;
      }
      const { nom, prenom, email, cv } = conseiller.data[0];
      const candidat = {
        nom,
        prenom,
        email
      };
      const instructionSuppression = motif === 'doublon' ? { '_id': new ObjectId(id), 'email': email } : { 'email': email };
      const tableauCandidat = await db.collection('conseillers').find(instructionSuppression).toArray();
      await verificationRoleUser(db, decode, req, res)(roles).then(userIdentifier => {
        user = userIdentifier;
        if (user.roles.includes('candidat')) {
          if (user.entity.oid.toString() !== conseiller.data[0]._id.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation', {
              id
            }).toJSON();
          }
        }
        return;
      }).then(() => {
        return verificationCandidaturesRecrutee(app, res)(tableauCandidat, id);
      }).then(() => {
        return archiverLaSuppression(app)(tableauCandidat, user, motif, actionUser);
      }).then(() => {
        return suppressionTotalCandidat(app)(tableauCandidat);
      }).then(() => {
        if (cv?.file && (motif !== 'doublon')) {
          return suppressionCv(cv, app).catch(error => {
            logger.error(error);
            app.get('sentry').captureException(error);
            res.status(500).send(new GeneralError('La suppression du cv a échoué.').toJSON());
          });
        }
        return;
      }).then(async () => {
        if (motif !== 'doublon') {
          candidatSupprimeEmailPix(db, app)(candidat);
          await deleteMailSib(app)(candidat.email);
        }
        return;
      }).then(() => {
        res.send({ deleteSuccess: true });
        return;
      }).catch(error => {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de la suppression de la candidature, veuillez réessayer.').toJSON());
      });
    });

    app.post('/conseillers/:id/relance-invitation', async (req, res) => {
      await checkAuth(req, res);
      await checkRoleAdmin(db, req, res);
      const conseillerId = new ObjectId(req.params.id);
      let user;
      let conseiller = await db.collection('conseillers').findOne({ _id: conseillerId });
      if (conseiller === null) {
        res.status(404).send(new NotFound('Conseiller n\'existe pas', {
          conseillerId,
        }).toJSON());
        return;
      }

      try {
        const conseillerUser = await db.collection('users').findOne({ 'entity.$id': conseillerId });
        user = conseillerUser;
        if (conseillerUser === null) {
          // message d'erreur dans le cas où le cron n'est pas encore passer
          res.status(404).send(new NotFound('Une erreur est survenue, veuillez réessayez plus tard', {
            conseillerId,
          }).toJSON());
          return;
        }
        if (conseillerUser.passwordCreated === true) {
          res.status(409).send(new Conflict(`Le compte de ${conseiller.prenom} ${conseiller.nom} est déjà activé`));
          return;
        }
        await db.collection('users').updateOne({ _id: conseillerUser._id }, { $set: { token: uuidv4(), tokenCreatedAt: new Date() } });
        let mailer = createMailer(app);
        const emails = createEmails(db, mailer, app);
        const typeEmail = user.roles.includes('conseiller') ? 'creationCompteConseiller' : 'creationCompteCandidat';
        let message = emails.getEmailMessageByTemplateName(typeEmail);
        const usersAJour = await db.collection('users').findOne({ _id: conseillerUser._id });
        await message.send(usersAJour);
        return res.status(200).json({ emailEnvoyer: true });
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de l\'envoi de l\'email').toJSON());
      }
    });

    app.get('/conseillers/geolocalisation', async (req, res) => {
      const db = await app.get('mongoClient');

      const conseillers = await geolocatedConseillers(geolocationRepository(db));

      res.send(conseillers);
    });

    app.get('/conseillers/geolocalisation/par-region', async (req, res) => {
      const db = await app.get('mongoClient');

      const conseillersByRegion = await geolocatedConseillersByRegion(geolocationRepository(db));

      res.send(conseillersByRegion);
    });

    app.get('/conseillers/geolocalisation/par-departement', async (req, res) => {
      const db = await app.get('mongoClient');

      const conseillersByDepartement = await geolocatedConseillersByDepartement(geolocationRepository(db));

      res.send(conseillersByDepartement);
    });

    app.get('/conseillers/permanence/:id', async (req, res) => {
      const db = await app.get('mongoClient');
      const conseiller = await permanenceRepository(db).getConseillerById(req.params.id);
      let permanence = (await permanenceRepository(db).getPermanenceById(req.params.id))[0];

      if (permanence) {
        const hasMultipleStructure = await permanenceRepository(db).checkMultipleStructureInLocation(permanence.location.coordinates);
        if (hasMultipleStructure > 1) {
          const permanencesByLocation = await permanenceRepository(db).getPermanenceBylocation(permanence.location.coordinates);
          permanence = await aggregationByLocation(permanencesByLocation, permanence);
        }
      }

      canActivate(
        existGuard(conseiller ?? permanence),
      ).then(async () => {
        if (conseiller !== null) {
          res.send(await permanenceDetailsFromStructureId(conseiller.structureId, permanenceRepository(db)));
        } else {
          res.send(await permanenceDetails(permanence, permanenceRepository(db)));
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/conseillers/geolocalisation/permanence/:id/localisation', async (req, res) => {
      const db = await app.get('mongoClient');
      const conseiller = await permanenceRepository(db).getConseillerById(req.params.id);
      let permanence = (await permanenceRepository(db).getPermanenceById(req.params.id))[0];
      if (permanence) {
        const hasMultipleStructure = await permanenceRepository(db).checkMultipleStructureInLocation(permanence.location.coordinates);
        if (hasMultipleStructure > 1) {
          const permanencesByLocation = await permanenceRepository(db).getPermanenceBylocation(permanence.location.coordinates);
          permanence = await aggregationByLocation(permanencesByLocation, permanence);
        }
      }

      canActivate(
        existGuard(conseiller ?? permanence),
      ).then(async () => {
        if (conseiller !== null) {
          res.send(await geolocatedStructure(conseiller.structureId, geolocationRepository(db)));
        } else {
          res.send(await geolocatedPermanence(permanence));
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.patch('/conseillers/updateInfosConseiller/:id', async (req, res) => {
      checkAuth(req, res);
      app.get('mongoClient').then(async db => {
        let initModifMailPersoConseiller = false;
        let initModifMailProConseiller = false;
        const { telephone, telephonePro, emailPro, email, dateDeNaissance, sexe } = req.body;
        const body = { telephone, telephonePro, emailPro, email, dateDeNaissance, sexe };
        const idConseiller = req.params.id;
        const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(idConseiller) });
        const minDate = dayjs().subtract(99, 'year');
        const maxDate = dayjs().subtract(18, 'year');
        const schema = Joi.object({
          // eslint-disable-next-line max-len
          email: Joi.string().trim().required().regex(/^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).error(new Error('L\'adresse email est invalide')),
          // eslint-disable-next-line max-len
          emailPro: Joi.string().trim().optional().allow('', null).regex(/^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).error(new Error('L\'adresse email professionnellle est invalide')),
          // eslint-disable-next-line max-len
          telephonePro: Joi.string().optional().allow('', null).regex(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/).error(new Error('Le numéro de téléphone professionnel est invalide')),
          sexe: Joi.string().valid('Homme', 'Femme', 'Autre').required().error(new Error('Le champ sexe est invalide')),
          // eslint-disable-next-line max-len
          dateDeNaissance: Joi.date().required().min(minDate).max(maxDate).error(new Error('La date de naissance est invalide'))
        });
        const regexOldTelephone = new RegExp('^((06)|(07))[0-9]{8}$');
        let extended = '';
        if (!regexOldTelephone.test(conseiller.telephone) || conseiller.telephone !== telephone) {
          extended = schema.keys({
            // eslint-disable-next-line max-len
            telephone: Joi.string().optional().allow('', null).regex(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/).error(new Error('Le numéro de téléphone personnel est invalide')),
          }).validate(body);
        } else {
          extended = schema.keys({
            telephone: Joi.string().optional().allow('', null).regex(/^((06)|(07))[0-9]{8}$/).error(new Error('Le numéro de téléphone personnel est invalide'))
          }).validate(body);
        }

        if (extended.error) {
          res.status(400).json(new BadRequest(schema.error));
          return;
        }

        const changeInfos = { telephone, telephonePro, sexe, dateDeNaissance };
        try {
          await app.service('conseillers').patch(idConseiller, changeInfos);
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
          res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
          return;
        }

        if (email !== conseiller.email) {

          const verificationEmail = await db.collection('conseillers').countDocuments({ email: email });
          if (verificationEmail !== 0) {
            logger.error(`Erreur: l'email ${email} est déjà utilisé par un autre utilisateur`);
            res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé par un autre utilisateur', {
              email
            }).toJSON());
            return;
          }
          try {
            await this.patch(idConseiller, { $set: { tokenChangementMail: uuidv4(), tokenChangementMailCreatedAt: new Date(), mailAModifier: email } });
            const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(idConseiller) });
            conseiller.nouveauEmail = email;
            let mailer = createMailer(app, email);
            const emails = createEmails(db, mailer);
            let message = emails.getEmailMessageByTemplateName('conseillerConfirmeNouveauEmail');
            await message.send(conseiller);
            initModifMailPersoConseiller = true;
          } catch (error) {
            context.app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
            return;
          }
        }
        if (emailPro !== conseiller?.emailPro) {

          const verificationEmail = await db.collection('conseillers').countDocuments({ emailPro: emailPro });
          if (verificationEmail !== 0) {
            logger.error(`Erreur: l'email professionnelle ${emailPro} est déjà utilisé par un autre utilisateur`);
            res.status(409).send(new Conflict('Erreur: l\'email professionnelle est déjà utilisé par un autre utilisateur', {
              email
            }).toJSON());
            return;
          }
          try {
            await this.patch(idConseiller, {
              $set: {
                tokenChangementMailPro: uuidv4(),
                tokenChangementMailProCreatedAt: new Date(),
                mailProAModifier: emailPro
              }
            });
            const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(idConseiller) });
            conseiller.nouveauEmailPro = emailPro;
            let mailer = createMailer(app, emailPro);
            const emails = createEmails(db, mailer);
            let message = emails.getEmailMessageByTemplateName('conseillerConfirmeNouveauEmailPro');
            await message.send(conseiller);
            initModifMailProConseiller = true;
          } catch (error) {
            context.app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
            return;
          }
        }
        res.send({
          'conseiller': changeInfos,
          initModifMailPersoConseiller,
          initModifMailProConseiller
        });
      });

    });
    app.patch('/conseillers/update_disponibilite/:id', async (req, res) => {
      checkAuth(req, res);
      const accessToken = req.feathers?.authentication?.accessToken;
      const userId = decode(accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      const idConseiller = req.params.id;
      const { disponible } = req.body;
      const disponibleValidation = Joi.boolean().required().error(new Error('Le format de la disponibilité est invalide')).validate(disponible);
      if (disponibleValidation.error) {
        res.status(400).json(new BadRequest(disponibleValidation.error));
        return;
      }
      const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(idConseiller) });
      if (!conseiller) {
        res.status(404).send(new NotFound('Conseiller n\'existe pas', {
          idConseiller,
        }).toJSON());
        return;
      }
      if (String(conseiller._id) !== String(user.entity.oid)) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId
        }).toJSON());
        return;
      }
      try {
        await pool.query(`UPDATE djapp_coach
            SET disponible = $2 WHERE id = $1`,
        [conseiller.idPG, disponible]);

      } catch (err) {
        logger.error(err);
        app.get('sentry').captureException(err);
      }
      try {
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { disponible, updatedAt: new Date() } });
      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(err);
      }
      try {
        if (disponible) {
          await db.collection('misesEnRelation').updateMany(
            {
              'conseiller.$id': conseiller._id,
              'statut': 'finalisee_non_disponible'
            },
            {
              $set:
                {
                  'statut': 'nouvelle',
                  'conseillerObj.updatedAt': new Date()
                }
            });
        } else {
          await db.collection('misesEnRelation').updateMany(
            {
              'conseiller.$id': conseiller._id,
              'statut': { '$in': ['nouvelle', 'nonInteressee', 'interessee'] }
            },
            {
              $set:
                {
                  'statut': 'finalisee_non_disponible',
                  'conseillerObj.updatedAt': new Date()
                }
            });
        }
        await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, {
          $set: {
            'conseillerObj.disponible': disponible,
            'conseillerObj.updatedAt': new Date() }
        });

      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(err);
      }
      res.send({ disponible });
    });

    app.patch('/conseillers/confirmation-email/:token', async (req, res) => {
      checkAuth(req, res);
      const accessToken = req.feathers?.authentication?.accessToken;
      let userId = decode(accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      const tokenChangementMail = req.params.token;
      let conseiller = '';
      const existTokenMailPro = await db.collection('conseillers').findOne({ 'tokenChangementMailPro': tokenChangementMail });
      const existTokenMail = await db.collection('conseillers').findOne({ 'tokenChangementMail': tokenChangementMail });
      if (existTokenMail) {
        conseiller = existTokenMail;
      }
      if (existTokenMailPro && !conseiller) {
        conseiller = existTokenMailPro;
      }
      if (!conseiller) {
        logger.error(`Token inconnu: ${tokenChangementMail}`);
        res.status(404).send(new NotFound('Conseiller not found', {
          tokenChangementMail
        }).toJSON());
        return;
      }
      if (String(conseiller._id) !== String(user.entity.oid)) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }
      if (!conseiller?.mailAModifier && !conseiller?.mailProAModifier) {
        res.status(404).send(new NotFound('mailAModifier not found').toJSON());
        return;
      }
      if (existTokenMail) {
        try {
          await this.patch(conseiller._id, {
            $set: { email: conseiller.mailAModifier },
            $unset: {
              mailAModifier: conseiller.mailAModifier,
              tokenChangementMail: conseiller.tokenChangementMail,
              tokenChangementMailCreatedAt: conseiller.tokenChangementMailCreatedAt
            }
          });
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
        res.send({ 'email': conseiller.mailAModifier, 'isEmailPro': false });
      } else {
        try {
          await this.patch(conseiller._id, {
            $set: { emailPro: conseiller.mailProAModifier },
            $unset: {
              mailProAModifier: conseiller.mailProAModifier,
              tokenChangementMailPro: conseiller.tokenChangementMailPro,
              tokenChangementMailProCreatedAt: conseiller.tokenChangementMailProCreatedAt
            }
          });
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
        res.send({ 'emailPro': conseiller.mailProAModifier, 'isEmailPro': true });
      }
    });


    app.get('/conseillers/subordonnes', async (req, res) => {
      checkAuth(req, res);
      const userId = userIdFromRequestJwt(req);
      const getUserById = userAuthenticationRepository(db);

      const schema = Joi.object({
        idCoordinateur: Joi.string().required().error(new Error('L\'id coordinateur est invalide')),
        page: Joi.string().required().error(new Error('La page est invalide')),
        dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
        dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
        filtreProfil: Joi.string().optional().allow(null).error(new Error('Le profil est invalide')),
        ordreNom: Joi.string().optional().allow(null).error(new Error('Le nom de l\'ordre est invalide')),
        ordre: Joi.string().optional().allow(null).error(new Error('L\'ordre est invalide')),
      }).validate(req.query);

      if (schema.error) {
        res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
        return;
      }

      const idCoordinateur = new ObjectId(req.query.idCoordinateur);
      const page = req.query.page;
      const dateDebut = new Date(req.query.dateDebut);
      const dateFin = new Date(req.query.dateFin);
      const filtreProfil = req.query.filtreProfil;
      const ordreNom = req.query.ordreNom === 'undefined' ? null : req.query.ordreNom;
      const ordre = Number(req.query.ordre);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Coordinateur], getUserById)
      ).then(async () => {
        await getConseillersByCoordinateurId(db)(idCoordinateur, page, dateDebut, dateFin, filtreProfil, ordreNom, ordre, options).then(async conseillers => {
          const promises = [];
          conseillers.data?.forEach(conseiller => {
            const p = new Promise(async resolve => {
              conseiller.craCount = await countCraConseiller(db)(conseiller._id, dateDebut, dateFin);
              resolve();
            });
            promises.push(p);
          });
          await Promise.all(promises);
          return res.send({ conseillers });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(500).send(new GeneralError('La recherche de conseillers a échoué, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/conseiller/isSubordonne', async (req, res) => {
      checkAuth(req, res);
      const userId = userIdFromRequestJwt(req);
      const getUserById = userAuthenticationRepository(db);
      const idCoordinateur = new ObjectId(req.query.idCoordinateur);
      const idConseiller = new ObjectId(req.query.idConseiller);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Coordinateur], getUserById)
      ).then(async () => {
        try {
          const boolSubordonne = await isSubordonne(db)(idCoordinateur, idConseiller);
          res.send({ 'isSubordonne': boolSubordonne });
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/conseiller/candidat/searchZoneGeographique/:adresse', async (req, res) => {
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const { adresse } = JSON.parse(req.params.adresse);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adresse}&type=municipality`;
        try {
          const params = {};
          const result = await axios.get(urlAPI, { params: params });
          return res.send({ 'adresseApi': result.data?.features });
        } catch (e) {
          return res.send({ 'adresseApi': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.patch('/conseiller/candidat/zoneGeographique/:id', async (req, res) => {
      checkAuth(req, res);
      const userId = userIdFromRequestJwt(req);
      const getUserById = userAuthenticationRepository(db);
      const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(req.params.id) });
      if (!conseiller) {
        res.status(404).send(new NotFound('Le conseiller n\'existe pas !', {
          id: new ObjectId(req.params.id)
        }).toJSON());
        return;
      }
      const updatedAt = new Date();
      const distanceMax = req.body.distanceMax;
      const codeCommune = req.body.codeCommune;
      const codePostal = req.body.codePostal;
      const nomCommune = req.body.ville;
      const location = req.body.location;
      let codeDepartement = codePostal.substr(0, 2);
      let codeCom = null;
      if (codePostal.substr(0, 2) === 97) {
        codeDepartement = codePostal.substr(0, 3);
      }
      let nomRegion = codeDepartements.find(d => d.num_dep === codeDepartement).region_name;
      let codeRegion = codeRegions.find(r => r.nom === nomRegion)?.code;
      if (codePostal === 97150) {
        codeDepartement = '00';
        codeRegion = '00';
        codeCom = '978';
      }
      const schema = Joi.object({
        ville: Joi.string().required().error(new Error('La ville est invalide')),
        codePostal: Joi.string().required().min(5).max(5).error(new Error('Le codePostal est invalide')),
        codeCommune: Joi.string().required().min(4).max(5).error(new Error('Le codeCommune est invalide')),
        location: Joi.object().required().error(new Error('La localisation doit obligatoirement être saisie')),
        distanceMax: Joi.number().required().allow(5, 10, 15, 20, 40, 100, 2000).error(new Error('La distance est invalide'))
      }).validate(req.body);

      if (schema.error) {
        res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
        return;
      }

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Conseiller], getUserById)
      ).then(async () => {
        try {
          await pool.query(`UPDATE djapp_coach
          (
            max_distance,
            zip_code,
            commune_code,
            departement_code,
            region_code,
            geo_name,
            location,
            codeCom)
            =
            ($2,$3,$4,$5,$6,$7,ST_GeomFromGeoJSON ($8), $9)
            WHERE id = $1`,
          [conseiller.idPG, distanceMax, codePostal, codeCommune, codeDepartement, codeRegion, nomCommune, location, codeCom]);

          await this.patch(conseiller._id, {
            $set: { nomCommune, codePostal, codeCommune, codeDepartement, codeRegion, location, distanceMax, updatedAt, codeCom },
          });

          await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, { $set: {
            'conseillerObj.nomCommune': nomCommune,
            'conseillerObj.codePostal': codePostal,
            'conseillerObj.codeCommune': codeCommune,
            'conseillerObj.codeDepartement': codeDepartement,
            'conseillerObj.codeRegion': codeRegion,
            'conseillerObj.location': location,
            'conseillerObj.distanceMax': distanceMax,
            'conseillerObj.updatedAt': updatedAt,
            'conseillerObj.codeCom': codeCom,
          } });

          res.send({ conseiller });

        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};
