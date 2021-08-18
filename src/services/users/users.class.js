const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, BadRequest, GeneralError } = require('@feathersjs/errors');

const logger = require('../../logger');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const slugify = require('slugify');
const { createMailbox, updateMailboxPassword } = require('../../utils/mailbox');
const { createAccount, updateAccountPassword } = require('../../utils/mattermost');
const { Pool } = require('pg');
const pool = new Pool();

const { v4: uuidv4 } = require('uuid');
const { DBRef, ObjectId, ObjectID } = require('mongodb');

exports.Users = class Users extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('users');
    });

    const db = app.get('mongoClient');
    let mailer = createMailer(app);
    const emails = createEmails(db, mailer, app);

    app.patch('/candidat/updateInfosCandidat/:id', async (req, res) => {
      const nouveauEmail = req.body.email;
      const { nom, prenom, telephone } = req.body;
      const idUser = req.params.id;
      const userConnected = await this.find({ query: { _id: idUser } });
      const changeInfos = { nom, prenom, telephone };
      try {
        await app.service('conseillers').patch(userConnected?.data[0].entity?.oid, changeInfos);
      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(err);
      }

      if (nouveauEmail !== userConnected.data[0].name) {

        app.get('mongoClient').then(async db => {
          const verificationEmail = await db.collection('users').countDocuments({ name: nouveauEmail });
          if (verificationEmail !== 0) {
            logger.error(`Erreur: l'email ${nouveauEmail} est déjà utilisé par une autre structure`);
            res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé par une autre structure', {
              nouveauEmail
            }).toJSON());
            return;
          }
          try {
            await this.patch(idUser, { $set: { token: uuidv4(), mailAModifier: nouveauEmail } });
            const user = await db.collection('users').findOne({ _id: new ObjectID(idUser) });
            user.nouveauEmail = nouveauEmail;
            let mailer = createMailer(app, nouveauEmail);
            const emails = createEmails(db, mailer);
            let message = emails.getEmailMessageByTemplateName('candidatConfirmeNouveauEmail');
            await message.send(user);
            res.send(user);
          } catch (error) {
            context.app.get('sentry').captureException(error);
            logger.error(error);
          }
        });
      }
      try {
        const { idPG } = await app.service('conseillers').get(userConnected?.data[0].entity?.oid);
        await pool.query(`UPDATE djapp_coach
            SET (
                  first_name,
                  last_name,
                  phone)
                  =
                  ($2,$3,$4)
                WHERE id = $1`,
        [idPG, prenom, nom, telephone]);
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
      }
    });

    app.patch('/candidat/confirmation-email/:token', async (req, res) => {
      const token = req.params.token;
      const user = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      if (user.total === 0) {
        logger.error(`Token inconnu: ${token}`);
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }
      const userInfo = user?.data[0];
      try {
        await this.patch(userInfo._id, { $set: { name: userInfo.mailAModifier } });
        await app.service('conseillers').patch(userInfo?.entity?.oid, { email: userInfo.mailAModifier });
      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(err);
      }
      try {
        const { idPG } = await app.service('conseillers').get(userInfo?.entity?.oid);
        await pool.query(`UPDATE djapp_coach
            SET email = $2
                WHERE id = $1`,
        [idPG, userInfo.mailAModifier]);
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
      }
      try {
        await this.patch(userInfo._id, { $set: { token: uuidv4() }, $unset: { mailAModifier: userInfo.mailAModifier } });
      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(err);
      }
      const apresEmailConfirmer = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      res.send(apresEmailConfirmer.data[0]);
    });

    app.patch('/confirmation-email/:token', async (req, res) => {
      const token = req.params.token;
      const user = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      if (user.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }
      const userInfo = user?.data[0];

      if (userInfo.mailAModifier === undefined) {
        res.status(400).send(new BadRequest('le nouveau mail n\'est pas renseignée', {
          token
        }).toJSON());
        return;
      }
      try {
        await this.patch(userInfo._id, { $set: { name: userInfo.mailAModifier, token: uuidv4() }, $unset: { mailAModifier: userInfo.mailAModifier } });
      } catch (err) {
        app.get('sentry').captureException(err);
        logger.error(`Erreur BD: ${err}`);
      }

      const apresEmailConfirmer = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      res.send(apresEmailConfirmer.data[0]);
    });

    app.patch('/users/sendEmailUpdate/:id', async (req, res) => {
      const nouveauEmail = req.body.name;
      const idUser = req.params.id;
      app.get('mongoClient').then(async db => {

        const verificationEmail = await db.collection('users').countDocuments({ name: nouveauEmail });
        if (verificationEmail !== 0) {
          logger.error(`Erreur: l'email ${nouveauEmail} est déjà utilisé par une autre structure`);
          res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé par une autre structure', {
            nouveauEmail
          }).toJSON());
          return;
        }
        try {
          await this.patch(idUser, { $set: { token: uuidv4(), mailAModifier: nouveauEmail } });
          const user = await db.collection('users').findOne({ _id: new ObjectID(idUser) });
          user.nouveauEmail = nouveauEmail;
          let mailer = createMailer(app, nouveauEmail);
          const emails = createEmails(db, mailer);
          let message = emails.getEmailMessageByTemplateName('confirmeNouveauEmail');
          await message.send(user);
          res.send(user);
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
        }
      });
    });

    app.get('/users/verifyToken/:token', async (req, res) => {
      const token = req.params.token;
      const users = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });

      if (users.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }

      //Si le user est un conseiller, remonter son email perso pour l'afficher (cas renouvellement mot de passe)
      if (users.data[0].roles[0] === 'conseiller') {
        let conseiller = await app.service('conseillers').get(users.data[0].entity?.oid);
        users.data[0].persoEmail = conseiller.email;
        res.send({ roles: users.data[0].roles,
          name: users.data[0].name, persoEmail: users.data[0].persoEmail, nom: users.data[0].nom, prenom: users.data[0].prenom });
      } else {
        res.send({ roles: users.data[0].roles, name: users.data[0].name });
      }
    });

    app.post('/users/inviteAccountsPrefet', async (req, res) => {
      const token = req.body.token;
      const expectedToken = app.get('authentication').prefet.token;
      if (token !== expectedToken) {
        res.status(404).send(new NotFound('Token invalid', {
          token
        }).toJSON());
        return;
      }
      req.body.emails.forEach(async email => {
        let userInfo = {
          name: email.toLowerCase(),
          roles: ['prefet'],
          departement: req.body.departement,
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          passwordCreated: false,
          createdAt: new Date()
        };
        await app.service('users').create(userInfo);
      });
      res.send({ status: 'accounts created' });
    });

    app.get('/users/verifyPrefetToken/:token', async (req, res) => {
      const token = req.params.token;
      const expectedToken = app.get('authentication').prefet.token;
      res.send({ isValid: token === expectedToken });
    });

    app.post('/users/inviteStructure', async (req, res) => {
      const email = req.body.email;
      const structureId = req.body.structureId;

      app.get('mongoClient').then(async db => {
        const verificationEmail = await db.collection('users').countDocuments({ name: email });
        if (verificationEmail !== 0) {
          res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé pour une structure').toJSON());
          return;
        }

        try {
          const connection = app.get('mongodb');
          const database = connection.substr(connection.lastIndexOf('/') + 1);
          const newUser = {
            name: email.toLowerCase(),
            roles: ['structure'],
            entity: new DBRef('structures', new ObjectId(structureId), database),
            token: uuidv4(),
            tokenCreatedAt: new Date(),
            passwordCreated: false,
            createdAt: new Date(),
            resend: false
          };

          await app.service('users').create(newUser);
          let mailer = createMailer(app, email);
          const emails = createEmails(db, mailer);
          let message = emails.getEmailMessageByTemplateName('invitationCompteStructure');
          await message.send(newUser, email);

          res.send({ status: 'Invitation à rejoindre la structure envoyée !' });
        } catch (error) {
          context.app.get('sentry').captureException(error);
          logger.error(error);
          res.send('Une erreur est survenue lors de l\'envoi de l\'invitation !');
        }
      });
    });

    app.get('/users/listByIdStructure/:id', async (req, res) => {
      const idStructure = req.params.id;
      const users = await this.find({
        query: {
          'entity.$id': new ObjectId(idStructure),
        }
      });

      res.send(users.data);
    });

    app.post('/users/choosePassword/:token', async (req, res) => {
      const token = req.params.token;
      const password = req.body.password;
      const typeEmail = req.body.typeEmail;
      const users = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });

      if (users.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }
      const user = users.data[0];
      const role = user.roles[0];
      app.service('users').patch(user._id, { password: password, passwordCreated: true, passwordCreatedAt: new Date() });

      if (typeEmail === 'bienvenue' && role === 'conseiller') {
        app.get('mongoClient').then(async db => {
          const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
          const login = slugify(`${conseiller.prenom}.${conseiller.nom}`, { replacement: '.', lower: true, strict: true });
          const gandi = app.get('gandi');
          const mattermost = app.get('mattermost');
          const email = `${login}@${gandi.domain}`;
          await db.collection('users').updateOne({ _id: user._id }, {
            $set: {
              name: email,
              token: uuidv4()
            }
          });
          user.name = email;
          createMailbox({
            gandi,
            conseillerId: user.entity.oid,
            login,
            password,
            db,
            logger,
            Sentry: app.get('sentry')
          });
          createAccount({
            mattermost,
            conseiller,
            email,
            login,
            password,
            db,
            logger,
            Sentry: app.get('sentry')
          });

          try {
            let message = emails.getEmailMessageByTemplateName('bienvenueCompteConseiller');
            await message.send(user, conseiller);

            // Envoi d'un deuxième email pour l'inscription à Pix Orga
            let messagePix = emails.getEmailMessageByTemplateName('pixOrgaConseiller');
            await messagePix.send(user, conseiller);

            res.send(user);
            return;
          } catch (err) {
            app.get('sentry').captureException(err);
            logger.error(err);
          }
        });
      } else {
        try {
          let message;
          if (typeEmail === 'bienvenue') {
            switch (role) {
              case 'admin':
                message = emails.getEmailMessageByTemplateName('bienvenueCompteAdmin');
                await message.send(user);
                break;
              case 'structure':
                message = emails.getEmailMessageByTemplateName('bienvenueCompteStructure');
                await message.send(user);
                break;
              case 'prefet':
                message = emails.getEmailMessageByTemplateName('bienvenueComptePrefet');
                await message.send(user);
                break;
              case 'candidat':
                message = emails.getEmailMessageByTemplateName('bienvenueCompteCandidat');
                await message.send(user);
                break;
              default:
                break;
            }
          } else if (role === 'conseiller' && typeEmail === 'renouvellement') {
            const conseiller = await app.service('conseillers').get(user.entity?.oid);
            //Mise à jour du password également dans Mattermost et Gandi
            const adressCN = conseiller.emailCN?.address;
            if (adressCN === undefined) {
              logger.error(`AdressCN not found for conseiller id id=${conseiller._id}`);
              res.status(404).send(new NotFound('Adresse Conseiller numerique non trouvé').toJSON());
              return;
            }
            const login = adressCN.substring(0, adressCN.lastIndexOf('@'));
            app.get('mongoClient').then(async db => {
              await updateMailboxPassword(app.get('gandi'), conseiller._id, login, password, db, logger, app.get('sentry'));
              await updateAccountPassword(app.get('mattermost'), conseiller, password, db, logger, app.get('sentry'));
            });
            //Renouvellement conseiller => envoi email perso
            user.persoEmail = conseiller.email;
            message = emails.getEmailMessageByTemplateName('renouvellementCompte');
            await message.send(user);
          } else {
            message = emails.getEmailMessageByTemplateName('renouvellementCompte');
            await message.send(user);
          }
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
        res.send({ roles: user.roles });
      }
    });

    app.post('/users/sendForgottenPasswordEmail', async (req, res) => {
      const username = req.body.username;
      const users = await this.find({
        query: {
          name: username,
          $limit: 1,
        }
      });

      if (users.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          username
        }).toJSON());
        return;
      }
      const user = users.data[0];
      user.token = uuidv4();

      //Si le user est un conseiller, envoyer le mail sur son email perso
      if (user.roles[0] === 'conseiller') {
        let conseiller = await app.service('conseillers').get(user.entity?.oid);
        user.persoEmail = conseiller.email;
      }

      try {
        this.Model.updateOne({ _id: user._id }, { $set: { token: user.token, tokenCreatedAt: new Date() } });
        let message = emails.getEmailMessageByTemplateName('motDePasseOublie');
        await message.send(user);
        res.status(200).json({ successResetPassword: true });
      } catch (err) {
        app.get('sentry').captureException(err);
        res.status(500).json(new GeneralError('Erreur mot de passe oublié.'));
      }
    });
  }
};
