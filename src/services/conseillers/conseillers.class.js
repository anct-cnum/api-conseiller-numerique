const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, GeneralError, NotAuthenticated, Forbidden, BadRequest } = require('@feathersjs/errors');
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const decode = require('jwt-decode');
const aws = require('aws-sdk');
const multer = require('multer');
const fileType = require('file-type');
const crypto = require('crypto');
const statsPdf = require('../stats/stats.pdf');
const dayjs = require('dayjs');
const Joi = require('joi');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const { v4: uuidv4 } = require('uuid');

const {
  checkAuth,
  checkRoleCandidat,
  checkConseillerExist,
  checkConseillerHaveCV,
  verificationRoleUser,
  verificationCandidaturesRecrutee,
  archiverLaSuppression,
  suppressionTotalCandidat,
  suppressionCv,
  suppressionCVConseiller,
  checkFormulaire,
  checkRoleAdmin,
  candidatSupprimeEmailPix } = require('./conseillers.function');

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

      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }

      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

      if (!user?.roles.includes('conseiller') && !user?.roles.includes('candidat')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: userId
        }).toJSON());
        return;
      }

      let conseiller = await this.find({
        query: {
          _id: new ObjectId(user.entity.oid),
          $limit: 1,
        }
      });

      if (conseiller.total === 0) {
        res.status(404).send(new NotFound('Ce compte n\'existe pas ! Vous allez être déconnecté.').toJSON());
        return;
      }

      const sexe = req.body.sexe;
      const dateDeNaissance = new Date(req.body.dateDeNaissance);

      const schema = checkFormulaire(req.body);

      if (schema.error) {
        res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
        return;
      }

      if (sexe === '' || dateDeNaissance === '') {
        res.status(400).send(new BadRequest('Erreur : veuillez remplir tous les champs obligatoires (*) du formulaire.').toJSON());
        return;
      }

      try {
        await this.patch(new ObjectId(user.entity.oid),
          { $set: {
            sexe: sexe,
            dateDeNaissance: dateDeNaissance
          } });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
        res.status(409).send(new Conflict('La mise à jour a échoué, veuillez réessayer.').toJSON());
      }

      res.send({ isUpdated: true });
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
              { $set: {
                cv: cv
              } });
            db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': conseiller.email },
              { $set: {
                'conseillerObj.cv': cv
              } });
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
      }

      const conseiller = await checkConseillerExist(db, req.params.id, user, res);
      if (!checkConseillerHaveCV(conseiller)) {
        res.status(404).send(new NotFound('CV not found for this conseiller', {
          conseillerId: user.entity.oid
        }).toJSON());
      }
      suppressionCv(conseiller.cv, app).then(() => {
        return suppressionCVConseiller(db, conseiller);
      }).then(() => {
        res.send({ deleteSuccess: true });
      }).catch(error => {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de la suppression du CV').toJSON());
      });
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
        res.status(404).send(new NotFound('CV not found for this conseiller', {
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

    app.get('/conseillers/statistiques.pdf', async (req, res) => {

      app.get('mongoClient').then(async db => {

        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        let userId = decode(accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user?.roles.includes('conseiller') && !user?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const dateDebut = dayjs(req.query.dateDebut).format('YYYY-MM-DD');
        const dateFin = dayjs(req.query.dateFin).format('YYYY-MM-DD');
        user.role = user.roles[0];
        user.pdfGenerator = true;
        delete user.roles;
        delete user.password;

        const schema = Joi.object({
          dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
          dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
        }).validate(req.query);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        let finUrl = '/conseiller/' + user.entity.oid + '/' + dateDebut + '/' + dateFin;

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

    app.get('/conseillers/:id/employeur', async (req, res) => {
      checkAuth(req, res);

      const accessToken = req.feathers?.authentication?.accessToken;

      let userId = decode(accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user?.roles.includes('admin')) {
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
        'statut': 'finalisee'
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
      }).then(() => {
        if (motif !== 'doublon') {
          return candidatSupprimeEmailPix(db, app)(candidat);
        }
        return;
      }).then(() => {
        res.send({ deleteSuccess: true });
      }).catch(error => {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de la suppression de la candidature, veuillez réessayer.').toJSON());
      });
    });


    app.post('/conseillers/:id/relance-inscription-candidat', async (req, res) => {
      await checkAuth(req, res);
      await checkRoleAdmin(db, req, res);
      const conseillerId = new ObjectId(req.params.id);
      let user;
      let conseiller = await db.collection('conseillers').findOne({ _id: conseillerId });
      if (conseiller === null) {
        res.status(404).send(new NotFound('Conseiller n\'existe pas', {
          conseillerId,
        }).toJSON());
      }

      try {
        const conseillerUser = await db.collection('users').findOne({ 'entity.$id': conseillerId });
        if (conseillerUser === null) {
          const verifEmail = await db.collection('users').countDocuments({ name: conseiller.email });
          if (verifEmail !== 0) {
            await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { userCreationError: true } });
            res.status(409).send(new Conflict(`un doublon a déjà un compte associé à ${conseiller.email}`));
            return;
          }
          const NOW = new Date();
          const obj = {
            name: conseiller.email,
            prenom: conseiller.prenom,
            nom: conseiller.nom,
            password: uuidv4(),
            roles: Array('candidat'),
            entity: {
              '$ref': `conseillers`,
              '$id': conseiller._id,
              '$db': db.serverConfig.s.options.dbName
            },
            token: uuidv4(),
            tokenCreatedAt: NOW,
            mailSentDate: null,
            passwordCreated: false,
            createdAt: NOW,
          };
          const createUser = await db.collection('users').insertOne(obj);
          user = createUser.ops[0];
        } else {
          user = conseillerUser;
        }
        if (user.roles[0] === 'candidat') {
          await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { userCreated: true }, $unset: { userCreationError: true } });
          let mailer = createMailer(app);
          const emails = createEmails(db, mailer, app);
          let message = emails.getEmailMessageByTemplateName('creationCompteCandidat');
          await message.send(user);
          res.send({ emailEnvoyer: true });
        } else {
          res.status(409).send(new Conflict(`${conseiller.prenom} ${conseiller.nom} est déjà recruté donc a un compte COOP existant`));
          return;
        }
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(500).send(new GeneralError('Une erreur est survenue lors de l\'envoi de l\'email').toJSON());
      }
    });
  }
};
