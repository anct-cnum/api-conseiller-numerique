const { Service } = require('feathers-mongodb');
const { NotFound, Conflict } = require('@feathersjs/errors');

const logger = require('../../logger');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const slugify = require('slugify');
const { createMailbox } = require('../../utils/mailbox');
const { createAccount } = require('../../utils/mattermost');

const { v4: uuidv4 } = require('uuid');

exports.Users = class Users extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('users');
    });

    const db = app.get('mongoClient');
    let mailer = createMailer(app);
    const emails = createEmails(db, mailer, app);

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
      try {
        await this.patch(userInfo._id, { $set: { name: userInfo.mailAModifier } });
      } catch (err) {
        app.get('sentry').captureException(err);
      }
      try {
        await this.patch(userInfo._id, { $unset: { mailAModifier: userInfo.mailAModifier } });
      } catch (err) {
        app.get('sentry').captureException(err);
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
          throw new Conflict('Erreur: l\'email est déjà utilisé par une autre structure');
        }
        await this.patch(idUser, { $set: { token: uuidv4() } });
        try {
          const user = await this.find({ query: { _id: idUser } });
          user.data[0].nouveauEmail = nouveauEmail;
          let mailer = createMailer(app, nouveauEmail);
          const emails = createEmails(db, mailer);
          let message = emails.getEmailMessageByTemplateName('confirmeNouveauEmail');
          await message.render(user.data[0]);
          await message.send(user.data[0], nouveauEmail);
          res.send(user.data[0]);
        } catch (error) {
          context.app.get('sentry').captureException(error);
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
      }

      res.send(users.data[0]);
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
      app.service('users').patch(user._id, { password: password, passwordCreated: true });

      if (role === 'conseiller') {
        app.get('mongoClient').then(async db => {
          const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
          const login = slugify(`${conseiller.prenom}.${conseiller.nom}`, { replacement: '.', lower: true, strict: true });
          const gandi = app.get('gandi');
          const mattermost = app.get('mattermost');
          const email = `${login}@${gandi.domain}`;
          await db.collection('users').updateOne({ _id: user._id }, {
            $set: {
              name: email
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
        });
      }

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
            case 'conseiller':
              let conseiller = await app.service('conseillers').get(user.entity?.oid);
              message = emails.getEmailMessageByTemplateName('bienvenueCompteConseiller');
              await message.send(user, conseiller);
              // Envoi d'un deuxième email pour l'inscription à Pix Orga
              let messagePix = emails.getEmailMessageByTemplateName('pixOrgaConseiller');
              await messagePix.send(user, conseiller);
              break;
            default:
              break;
          }
        } else if (role === 'conseiller' && typeEmail === 'renouvellement') {
          //Renouvellement conseiller => envoi email perso
          let conseiller = await app.service('conseillers').get(user.entity?.oid);
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

      res.send(user);
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
        this.Model.updateOne({ _id: user._id }, { $set: { token: user.token, tokenCreatedAt: new Date(), passwordCreated: false } });
        let message = emails.getEmailMessageByTemplateName('motDePasseOublie');
        await message.send(user);

      } catch (err) {
        app.get('sentry').captureException(err);
      }

      res.send(user);
    });
  }
};
