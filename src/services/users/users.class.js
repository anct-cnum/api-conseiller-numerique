const { Service } = require('feathers-mongodb');
const { NotFound } = require('@feathersjs/errors');

const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');

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
      // Je ne rentre pas dans l'api
      console.log('APi');
      const token = req.params.token;
      const user = await this.findOne({
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
      await this.updateOne({
        $set: {
          name: user.nouveauEmail
        },
        $unset: {
          mailAModifier: user.mailAModifier
        } });

      res.send('/email-confirmer');
      res.end();
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
      app.service('users').patch(user._id, { password: password, passwordCreated: true });

      try {
        let message;
        if (typeEmail === 'bienvenue') {
          switch (user.roles[0]) {
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
              break;
            default:
              break;
          }
        } else if (user.roles[0] === 'conseiller' && typeEmail === 'renouvellement') {
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
