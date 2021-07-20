const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, GeneralError, NotAuthenticated, Forbidden, BadRequest } = require('@feathersjs/errors');
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const decode = require('jwt-decode');
const aws = require('aws-sdk');
const multer = require('multer');
const fileType = require('file-type');

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
      const user = req.body.user;

      if (user.sexe === '' || user.dateDeNaissance === '') {
        res.status(400).send(new BadRequest('Erreur : veuillez remplir tous les champs obligatoires (*) du formulaire.').toJSON());
        return;
      }

      let conseiller = await this.find({
        query: {
          _id: new ObjectId(user.idCandidat),
          $limit: 1,
        }
      });

      if (conseiller.total === 0) {
        res.status(409).send(new Conflict('Ce compte candidat n\'existe pas ! Vous allez être déconnecté.').toJSON());
        return;
      }

      try {
        await this.patch(new ObjectId(user.idCandidat),
          { $set: {
            sexe: user.sexe,
            dateDeNaissance: user.dateDeNaissance
          } });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
        res.status(409).send(new Conflict('La mise à jour a échoué, veuillez réessayer.').toJSON());
      }

      res.send({ isUpdated: true });
    });

    app.post('/conseillers/uploadCV', upload.single('file'), async (req, res) => {

      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
      }
      //Verification role candidat
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const candidatUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!candidatUser?.roles.includes('candidat')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: candidatUser
        }).toJSON());
        return;
      }

      const cvFile = req.file;
      if (cvFile === undefined) {
        res.status(400).send(new BadRequest('Erreur : cv non envoyé').toJSON());
        return;
      }
      //verification type PDF / DOC / DOCX (ne pas faire confiance qu'au mime/type envoyé)
      const allowedExt = ['pdf', 'doc', 'docx'];
      const allowedMime = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      let detectingFormat = await fileType.fromBuffer(cvFile.buffer);

      //Cas particulier du .doc : l'extension file-type le considere comme un fichier cfb donc passer la verif du buffer pour ce cas uniquement
      let docFile = cvFile.mimetype === 'application/msword';
      if (!docFile && (!allowedExt.includes(detectingFormat.ext) || !allowedMime.includes(cvFile.mimetype) || !allowedMime.includes(detectingFormat.mime))) {
        res.status(400).send(new BadRequest('Erreur : mauvais format de CV').toJSON());
        return;
      }

      //Nom du fichier avec id conseiller + extension fichier envoyé
      let nameCVFile = candidatUser.entity.oid + '.' + cvFile.originalname.split('.').pop();

      //TODO STOCK DANS MONGO le lien du fichier
      //CRYPTER LES FICHIERS

      //initialisation AWS
      const awsConfig = app.get('aws');
      aws.config.update({ accessKeyId: awsConfig.aws_access_key_id, secretAccessKey: awsConfig.aws_secret_access_key });
      const ep = new aws.Endpoint(awsConfig.aws_endpoint);
      const s3 = new aws.S3({ endpoint: ep });

      let params = { Bucket: awsConfig.aws_cv_bucket, Key: nameCVFile, Body: cvFile.buffer };

      // eslint-disable-next-line no-unused-vars
      s3.putObject(params, function(error, data) {
        if (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          res.status(500).send(new GeneralError('Le dépôt du cv a échoué, veuillez réessayer plus tard.').toJSON());
        } else {
          res.send({ isUploaded: true });
        }
      });

    });

  }
};
