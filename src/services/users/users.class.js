const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, BadRequest, GeneralError, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const logger = require('../../logger');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const slugify = require('slugify');
const { createMailbox, updateMailboxPassword, deleteMailbox } = require('../../utils/mailbox');
const { createAccount, updateAccountPassword, patchLogin } = require('../../utils/mattermost');
const { Pool } = require('pg');
const pool = new Pool();
const Joi = require('joi');
const decode = require('jwt-decode');
const axios = require('axios');

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
      app.get('mongoClient').then(async db => {
        const nouveauEmail = req.body.email.toLowerCase();
        const { nom, prenom, telephone, dateDisponibilite, email } = req.body;
        const body = { nom, prenom, telephone, dateDisponibilite, email };
        const schema = Joi.object({
          prenom: Joi.string().error(new Error('Le nom est invalide')),
          nom: Joi.string().error(new Error('Le nom est invalide')),
          telephone: Joi.string().required().max(10).error(new Error('Le format du téléphone est invalide, il doit contenir 10 chiffres ')),
          // eslint-disable-next-line max-len
          dateDisponibilite: Joi.date().error(new Error('La date est invalide, veuillez choisir une date supérieur ou égale à la date du jour')),
          email: Joi.string().email().error(new Error('Le format de l\'email est invalide')),
        }).validate(body);

        if (schema.error) {
          res.status(400).json(new BadRequest(schema.error));
          return;
        }
        const idUser = req.params.id;
        const userConnected = await this.find({ query: { _id: idUser } });
        const id = userConnected?.data[0].entity?.oid;
        const changeInfos = { nom, prenom, telephone, dateDisponibilite };
        const changeInfosMisesEnRelation = {
          'conseillerObj.nom': nom,
          'conseillerObj.prenom': prenom,
          'conseillerObj.telephone': telephone,
          'conseillerObj.dateDisponibilite': dateDisponibilite };
        try {
          await app.service('conseillers').patch(id, changeInfos);
          await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': id }, { $set: changeInfosMisesEnRelation });
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
          res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
          return;
        }

        if (nouveauEmail !== userConnected.data[0].name) {

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
          } catch (error) {
            context.app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
            return;
          }
        }
        try {
          const { idPG } = await app.service('conseillers').get(id);
          await pool.query(`UPDATE djapp_coach
            SET (
                  first_name,
                  last_name,
                  phone,
                  start_date)
                  =
                  ($2,$3,$4,$5)
                WHERE id = $1`,
          [idPG, prenom, nom, telephone, dateDisponibilite]);
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          res.status(500).json(new GeneralError('Une erreur s\'est produite, veuillez réessayez plus tard !'));
          return;
        }
        res.send({ success: true });
      });

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
      if (!userInfo?.mailAModifier) {
        res.status(404).send(new NotFound('mailAModifier not found').toJSON());
        return;
      }
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
      let conseiller = await app.service('conseillers').get(users.data[0].entity?.oid);
      users.data[0].persoEmail = conseiller.email;
      // eslint-disable-next-line camelcase
      const { roles, name, persoEmail, nom, prenom, support_cnfs } = users.data[0];
      if (roles.includes('conseiller')) {
        res.send({ roles, name, persoEmail, nom, prenom, support_cnfs });
      } else {
        res.send({ roles, name });
      }
    });

    app.post('/users/inviteAccountsPrefet', async (req, res) => {
      if (req?.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const adminUser = await this.find({
        query: {
          _id: new ObjectID(userId),
          $limit: 1,
        }
      });
      if (!adminUser?.data[0].roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser?.data[0]._id
        }).toJSON());
        return;
      }
      req.body.emails.forEach(async email => {
        app.get('mongoClient').then(async db => {
          const verificationEmail = await db.collection('users').countDocuments({ name: email });
          if (verificationEmail !== 0) {
            res.status(409).send(new Conflict(`Compte déjà existant pour l'email : ${email}, veuillez le retirer de la liste`));
            return;
          }
        });
      });
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
        res.send({ status: 'compte créé' });
      });
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
      app.get('mongoClient').then(async db => {
        const users = await db.collection('users').aggregate([
          { '$match': { 'entity.$id': new ObjectId(idStructure) } },
          { '$project': { name: 1, roles: 1, passwordCreated: 1 } }
        ]).toArray();
        res.send(users);
      });
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
          const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
          const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
          const login = `${prenom}.${nom}`;
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
            // Mise à jour du password également dans Mattermost et Gandi
            const adressCN = conseiller.emailCN?.address;
            if (adressCN === undefined) {
              logger.error(`AdressCN not found for conseiller id id=${conseiller._id}`);
              res.status(404).send(new NotFound('Adresse email Conseiller Numérique non trouvée').toJSON());
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

    app.post('/users/checkForgottenPasswordEmail', async (req, res) => {
      const username = req.body.username.trim();
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
      let hiddenEmail = '';

      //Si le user est un conseiller, on renvoie l'email obscurci
      if (user.roles[0] === 'conseiller') {
        const hide = t => {
          if (t.length === 0) {
            return '';
          } else if (t.length === 1) {
            return '*'; // a => *
          } else if (t.length === 2) {
            return t.charAt(0) + '*'; // ab => a*
          } else {
            return t.charAt(0) + '*'.repeat(t.length - 2) + t.charAt(t.length - 1); // abcdef => a****f
          }
        };
        let conseiller = await app.service('conseillers').get(user.entity?.oid);
        // conseiller.email : email perso du conseiller
        const regexp = /([^@]+)@([^@]+)[.](\w+)/; // Extraction des trois morceaux du mail
        let match = conseiller.email.match(regexp);
        let premierePartie;
        let domaine;
        let extension;
        if (match && match.length > 3) {
          premierePartie = match[1];
          domaine = match[2];
          extension = match[3];
        } else {
          const err = new Error('Erreur mot de passe oublié, format email invalide');
          logger.error(err);
          app.get('sentry').captureException(err);
          res.status(500).json(new GeneralError('Erreur mot de passe oublié.'));
          return;
        }
        hiddenEmail = `${hide(premierePartie)}@${hide(domaine)}.${extension}`;
      }

      try {
        res.status(200).json({
          hiddenEmail: hiddenEmail,
          successCheckEmail: true
        });
      } catch (err) {
        logger.error(err);
        app.get('sentry').captureException(err);
        res.status(500).json(new GeneralError('Erreur mot de passe oublié.'));
      }
    });

    app.post('/users/sendForgottenPasswordEmail', async (req, res) => {
      const username = req.body.username.toLowerCase().trim();
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

    app.patch('/users/changement-email-pro/:token', async (req, res) => {
      const misesajourMongo = db => async (conseillerId, email, userIdentity, password) => {
        const { mattermost, emailCN } = await db.collection('conseillers').findOne({ _id: conseillerId });
        await db.collection('conseillers').updateOne({ _id: conseillerId }, { $set: { nom: userIdentity.nom, prenom: userIdentity.prenom } });
        await db.collection('misesEnRelation').updateMany(
          { 'conseiller.$id': conseillerId },
          { $set: {
            'conseillerObj.mattermost': mattermost,
            'conseillerObj.emailCN': emailCN,
            'conseillerObj.nom': userIdentity.nom,
            'conseillerObj.prenom': userIdentity.prenom
          }
          });
        const idUser = await db.collection('users').findOne({ 'entity.$id': conseillerId });
        app.service('users').patch(idUser._id, { password: password, name: email, nom: userIdentity.nom, prenom: userIdentity.prenom });
      };
      const misesajourPg = async (idPG, nom, prenom) => {
        await pool.query(`UPDATE djapp_coach
        SET (first_name, last_name) = ($2, $3) WHERE id = $1`,
        [idPG, prenom, nom]);
      };
      const { total, data } = await this.find({
        query: {
          token: req.params.token,
          $limit: 1,
        }
      });
      const user = data[0];
      if (total === 0) {
        res.status(404).send(new NotFound('Compte non trouvé', {
          id: user._id
        }).toJSON());
        return;
      }
      const password = req.body.password;
      console.log('password:', password);
      const conseillerId = user.entity.oid;
      const gandi = app.get('gandi');
      const Sentry = app.get('sentry');
      const mattermost = app.get('mattermost');
      let mailer = createMailer(app);
      const emails = createEmails(db, mailer, app, logger);
      let message = emails.getEmailMessageByTemplateName('confirmationChangeEmailCnfs');

      app.get('mongoClient').then(async db => {
        const conseiller = await db.collection('conseillers').findOne({ _id: conseillerId });
        let lastLogin = conseiller.emailCN.address.substring(0, conseiller.emailCN.address.lastIndexOf('@'));
        const email = `${user.support_cnfs.login}@${gandi.domain}`;
        const userIdentity = {
          email: user.support_cnfs.nouveauEmail,
          nom: user.support_cnfs.nom,
          prenom: user.support_cnfs.prenom,
          login: user.support_cnfs.login
        };
        conseiller.message_email = {
          email_future: user.support_cnfs.nouveauEmail
        };
        let login = user.support_cnfs.login;

        if (conseiller.emailCN.address) {
          await deleteMailbox(gandi, conseillerId, lastLogin, db, logger, Sentry).then(async () => {
            return patchLogin({ mattermost, conseiller, userIdentity, Sentry, logger, db });
          }).then(() => {
            return updateAccountPassword(mattermost, conseiller, password, db, logger, Sentry);
          }).then(async () => {
            await misesajourPg(conseiller.idPG, user.support_cnfs.nom, user.support_cnfs.prenom);
            return await misesajourMongo(db)(conseillerId, email, userIdentity, password);
          }).then(async () => {
            await setTimeout(async () => {
              try {
                await createMailbox({ gandi, conseillerId, login, password, db, logger, Sentry });
                await message.send(conseiller);
                return res.status(200).send('Votre nouveau email a été crée avec succès');
              } catch (error) {
                logger.error(error);
                app.get('sentry').captureException(error);
                res.status(500).json(new GeneralError('Erreur lors de la création de la boite mail, veuillez contacter le support'));
                return;
              }
            }, 5000);
          }).catch(error => {
            logger.error(error);
            app.get('sentry').captureException(error);
            res.status(500).json(new GeneralError('Une erreur s\'est produite., veuillez réessayer plus tard.'));
            return;
          });
        }
      });
    });
  }
};
