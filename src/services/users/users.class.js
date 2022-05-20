const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, BadRequest, GeneralError, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const logger = require('../../logger');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const slugify = require('slugify');
const { createMailbox, updateMailboxPassword, deleteMailbox } = require('../../utils/mailbox');
const { createAccount, updateAccountPassword } = require('../../utils/mattermost');
const { Pool } = require('pg');
const pool = new Pool();
const Joi = require('joi');
const decode = require('jwt-decode');
const { misesAJourPg, misesAJourMongo, historisationMongo,
  getConseiller, patchApiMattermostLogin, validationEmailPrefet, validationCodeRegion, validationCodeDepartement } = require('./users.repository');
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
          'conseillerObj.dateDisponibilite': dateDisponibilite
        };
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
            logger.error(`Erreur: l'email ${nouveauEmail} est déjà utilisé.`);
            res.status(409).send(new Conflict('Erreur: l\'email saisi est déjà utilisé', {
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

      // eslint-disable-next-line camelcase
      const { roles, name, persoEmail, nom, prenom, support_cnfs } = users.data[0];
      if (roles.includes('conseiller')) {
        //Si le user est un conseiller, remonter son email perso pour l'afficher (cas renouvellement mot de passe)
        const conseiller = await app.service('conseillers').get(users.data[0].entity?.oid);
        users.data[0].persoEmail = conseiller.email;
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
      const { niveau, emails } = req.body;
      const { departement, regionCode } = niveau;
      if (!departement && !regionCode) {
        res.status(400).send(new BadRequest('Une erreur s\'est produite, veuillez réessayez plus tard !'));
        return;
      } else {
        if (departement) {
          const schemaDeparetement = await validationCodeDepartement(Joi)(niveau);
          if (schemaDeparetement.error) {
            res.status(400).send(new BadRequest(schemaDeparetement.error));
            return;
          }
        }
        if (regionCode) {
          const schemaRegion = await validationCodeRegion(Joi)(niveau);
          if (schemaRegion.error) {
            res.status(400).send(new BadRequest(schemaRegion.error));
            return;
          }
        }
      }
      let promises = [];
      const errorConflict = email => res.status(409).send(new Conflict(`Compte déjà existant pour l'email : ${email}, veuillez le retirer de la liste`));
      const errorBadRequestJoi = schema => res.status(400).send(new BadRequest(schema.error));
      let emailForEach;
      let emailMongoTrue = false;
      let schemaJoi;
      let errorValidationJoiTrue = false;
      await emails.forEach(async email => {
        await app.get('mongoClient').then(async db => {
          promises.push(new Promise(async resolve => {
            const schema = await validationEmailPrefet(Joi)(email);
            if (schema.error) {
              schemaJoi = schema;
              errorValidationJoiTrue = true;
            }
            const verificationEmail = await db.collection('users').countDocuments({ name: email });
            if (verificationEmail !== 0) {
              emailForEach = email;
              emailMongoTrue = true;
            }
            resolve();
          }));
        });
      });
      await Promise.all(promises);
      if (errorValidationJoiTrue) {
        errorBadRequestJoi(schemaJoi);
        return;
      } else if (emailMongoTrue) {
        errorConflict(emailForEach);
        return;
      }
      await emails.forEach(async email => {
        let userInfo = {
          name: email.toLowerCase(),
          roles: ['prefet'],
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          passwordCreated: false,
          createdAt: new Date()
        };
        if (departement) {
          userInfo.departement = departement;
        } else {
          userInfo.region = regionCode;
        }
        await app.service('users').create(userInfo);
      });
      res.send({ status: 'compte créé' });
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
            roles: ['structure', 'structure_coop'],
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
          let messageCoop = emails.getEmailMessageByTemplateName('invitationStructureEspaceCoop');
          await messageCoop.send(newUser);

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
          const gandi = app.get('gandi');
          let login = `${prenom}.${nom}`;
          let conseillerNumber = await db.collection('conseillers').countDocuments(
            {
              'emailCN.address': `${login}@${gandi.domain}`,
              'statut': { $ne: 'RUPTURE' }
            });
          if (conseillerNumber > 0) {
            let indexLoginConseiller = 1;
            do {
              login = `${prenom}.${nom}` + indexLoginConseiller.toString();
              conseillerNumber = await db.collection('conseillers').countDocuments(
                {
                  'emailCN.address': `${login}@${gandi.domain}`,
                  'statut': { $ne: 'RUPTURE' }
                });
              indexLoginConseiller += 1;
            } while (conseillerNumber !== 0);
          }
          const mattermost = app.get('mattermost');
          const email = `${login}@${gandi.domain}`;
          await db.collection('users').updateOne({ _id: user._id }, {
            $set: {
              name: email,
              token: uuidv4()
            }
          });
          user.name = email;
          // La boite mail a été créée dans import-recrutes.js
          await updateMailboxPassword(gandi, user.entity.oid, login, password, db, logger, app.get('sentry'));
          await createAccount({
            mattermost,
            conseiller,
            email,
            login,
            nom,
            prenom,
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
              case 'hub_coop':
                message = emails.getEmailMessageByTemplateName('bienvenueCompteHub');
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
              await updateAccountPassword(app.get('mattermost'), db, logger, app.get('sentry'))(conseiller, password);
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
      if (user.roles.includes('conseiller') && user.passwordCreated === false) {
        // eslint-disable-next-line max-len
        res.status(409).send(new Conflict(`Vous n'avez pas encore activé votre compte. Pour cela, cliquez sur le lien d'activation fourni dans le mail ayant pour objet "Activer votre compte Coop des Conseillers numériques France Services"`, {
          username
        }).toJSON());
        return;
      }
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
        return;
      } catch (err) {
        logger.error(err);
        app.get('sentry').captureException(err);
        res.status(500).json(new GeneralError('Erreur mot de passe oublié.'));
        return;
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
      if (user.passwordCreated === false) {
        res.status(400).send(new BadRequest('Error authorization forgottenPassword', {
          username
        }).toJSON());
        return;
      }
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
        return;
      } catch (err) {
        app.get('sentry').captureException(err);
        res.status(500).json(new GeneralError('Erreur mot de passe oublié.'));
        return;
      }
    });

    app.patch('/users/changement-email-pro/:token', async (req, res) => {

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
      if (!user?.roles.includes('conseiller') || !user?.support_cnfs) {
        res.status(409).send(new Conflict('Vous n\'avez pas l\'autorisation', {
          id: user._id
        }).toJSON());
        return;
      }
      const password = req.body.password;
      const conseillerId = user?.entity?.oid;
      const gandi = app.get('gandi');
      const Sentry = app.get('sentry');
      const mattermost = app.get('mattermost');

      app.get('mongoClient').then(async db => {
        const conseiller = await getConseiller(db)(conseillerId);
        const lastLogin = conseiller?.emailCN?.address.substring(0, conseiller?.emailCN?.address.lastIndexOf('@'));
        const email = `${user.support_cnfs.login}@${gandi.domain}`;
        const userIdentity = {
          email: user?.support_cnfs?.nouveauEmail,
          nom: user?.support_cnfs?.nom,
          prenom: user?.support_cnfs?.prenom,
          login: user?.support_cnfs?.login
        };
        conseiller.message_email = {
          email_future: user?.support_cnfs?.nouveauEmail
        };
        const login = user?.support_cnfs?.login;
        const mailer = createMailer(app);
        const emails = createEmails(db, mailer, app, logger);
        const message = emails.getEmailMessageByTemplateName('confirmationChangeEmailCnfs');

        if (conseiller?.emailCN?.address) {
          await deleteMailbox(gandi, db, logger, Sentry)(conseillerId, lastLogin).then(async () => {
            // eslint-disable-next-line max-len
            return patchApiMattermostLogin({ Sentry, logger, db, mattermost })({ conseiller, userIdentity });
          }).then(() => {
            return updateAccountPassword(mattermost, db, logger, Sentry)(conseiller, password);
          }).then(async () => {
            await misesAJourPg(pool)(conseiller.idPG, user.support_cnfs.nom, user.support_cnfs.prenom);
            return await misesAJourMongo(db, app)(conseillerId, email, userIdentity, password);
          }).then(async () => {
            try {
              await createMailbox({ gandi, db, logger, Sentry })({ conseillerId, login, password });
              await message.send(conseiller);
              await historisationMongo(db)(conseillerId, conseiller, user);
              return res.status(200).send({ messageCreationMail: 'Votre nouvel email a été créé avec succès' });
            } catch (error) {
              logger.error(error);
              app.get('sentry').captureException(error);
              res.status(500).send(new GeneralError('Erreur lors de la création de la boîte mail, veuillez contacter le support'));
              return;
            }
          }).catch(error => {
            logger.error(error);
            app.get('sentry').captureException(error);
            res.status(500).send(new GeneralError('Une erreur s\'est produite., veuillez réessayer plus tard.'));
            return;
          });
        }
      });
    });
  }
};
