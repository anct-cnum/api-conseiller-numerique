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
const { jwtDecode } = require('jwt-decode');
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
        let { nom, prenom, telephone, dateDisponibilite, email } = req.body;
        telephone = telephone.trim();
        email = email.trim();
        const mongoDateDisponibilite = new Date(dateDisponibilite);
        const body = { nom, prenom, telephone, dateDisponibilite, email };
        const schema = Joi.object({
          prenom: Joi.string().error(new Error('Le nom est invalide')),
          nom: Joi.string().error(new Error('Le nom est invalide')),
          // eslint-disable-next-line max-len
          telephone: Joi.string().required().regex(new RegExp(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/)).error(new Error('Le format du téléphone est invalide')),
          // eslint-disable-next-line max-len
          dateDisponibilite: Joi.date().error(new Error('La date est invalide, veuillez choisir une date supérieur ou égale à la date du jour')),
          // eslint-disable-next-line max-len
          email: Joi.string().trim().required().regex(/^([a-zA-Z0-9]+(?:[\\._-][a-zA-Z0-9]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).error(new Error('Le format de l\'email est invalide')),
        });
        const regexOldTelephone = new RegExp('^((06)|(07))[0-9]{8}$');
        let extended = '';
        if (!regexOldTelephone.test(telephone)) {
          extended = schema.keys({
            // eslint-disable-next-line max-len
            telephone: Joi.string().required().regex(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/).error(new Error('Le numéro de téléphone personnel est invalide')),
          }).validate(body);
        } else {
          extended = schema.keys({
            telephone: Joi.string().required().regex(/^((06)|(07))[0-9]{8}$/).error(new Error('Le numéro de téléphone personnel est invalide'))
          }).validate(body);
        }

        if (extended.error) {
          res.status(400).json(new BadRequest(extended.error));
          return;
        }
        const idUser = req.params.id;
        const userConnected = await this.find({ query: { _id: idUser } });
        const id = userConnected?.data[0].entity?.oid;
        const changeInfos = { nom, prenom, telephone, 'dateDisponibilite': mongoDateDisponibilite };
        const changeInfosMisesEnRelation = {
          'conseillerObj.nom': nom,
          'conseillerObj.prenom': prenom,
          'conseillerObj.telephone': telephone,
          'conseillerObj.dateDisponibilite': mongoDateDisponibilite
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
          const gandi = app.get('gandi');
          if (nouveauEmail.includes(gandi.domain)) {
            res.status(400).send(new BadRequest('Erreur: l\'email saisi est invalide', {
              nouveauEmail
            }).toJSON());
            return;
          }
          const verificationEmail = await db.collection('users').countDocuments({ name: nouveauEmail });
          // vérification si le nouvel email est déjà utilisé par un conseiller
          const hasUserCoop = await db.collection('conseillers').countDocuments({ statut: { $exists: true }, email: nouveauEmail });
          if (verificationEmail !== 0 || hasUserCoop !== 0) {
            logger.error(`Erreur: l'email ${nouveauEmail} est déjà utilisé.`);
            res.status(409).send(new Conflict('Erreur: l\'email saisi est déjà utilisé', {
              nouveauEmail
            }).toJSON());
            return;
          }
          try {
            await this.patch(idUser, { $set: { token: uuidv4(), tokenCreatedAt: new Date(), mailAModifier: nouveauEmail } });
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
        res.send({ success: true, sendmail: nouveauEmail !== userConnected.data[0].name });
      });

    });

    app.patch('/candidat/confirmation-email/:token', async (req, res) => {
      app.get('mongoClient').then(async db => {
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
          await pool.query(`UPDATE djapp_coach
            SET email = LOWER($2)
                WHERE LOWER(email) = LOWER($1)`,
          [userInfo.name, userInfo.mailAModifier]);
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
        }
        try {
          await this.patch(userInfo._id, { $set: { name: userInfo.mailAModifier.toLowerCase() } });
          await app.service('conseillers').patch(userInfo?.entity?.oid, { email: userInfo.mailAModifier.toLowerCase() });
          await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': userInfo?.entity?.oid },
            { '$set': { 'conseillerObj.email': userInfo.mailAModifier.toLowerCase() } }
          );
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
        try {
          await this.patch(userInfo._id, { $set: { token: null, tokenCreatedAt: null }, $unset: { mailAModifier: '' } });
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
    });

    app.patch('/confirmation-email/:token', async (req, res) => { // Portail-backoffice
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
        await this.patch(userInfo._id, { $set: { name: userInfo.mailAModifier.toLowerCase(), token: uuidv4() }, $unset: { mailAModifier: '' } });
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
      const nouveauEmail = req.body.name.toLowerCase();
      const idUser = req.params.id;
      const emailValidation = Joi.string().email().required().error(new Error('Le format de l\'email est invalide')).validate(nouveauEmail);
      if (emailValidation.error) {
        res.status(400).json(new BadRequest(emailValidation.error));
        return;
      }
      app.get('mongoClient').then(async db => {
        const verificationEmail = await db.collection('users').countDocuments({ name: nouveauEmail });
        if (verificationEmail !== 0) {
          logger.error(`Erreur: l'email ${nouveauEmail} est déjà utilisé`);
          res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé', {
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
        // eslint-disable-next-line camelcase
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
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
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
      const schema = Joi.object({
        email: Joi.string().trim().email().required().error(new Error('Le format de l\'email est invalide')),
        structureId: Joi.string().required().error(new Error('Id de la structure est invalide')),
      }).validate(req.body);
      if (schema.error) {
        res.status(400).json(new BadRequest(schema.error));
        return;
      }
      app.get('mongoClient').then(async db => {
        const verificationEmail = await db.collection('users').countDocuments({ name: email });
        if (verificationEmail !== 0) {
          res.status(409).send(new Conflict('Erreur: l\'email est déjà utilisé pour une structure').toJSON());
          return;
        }
        const emailExistStructure = await db.collection('structures').countDocuments({ 'contact.email': email });
        if (emailExistStructure !== 0) {
          return res.status(409).send(new Conflict('L\'adresse email que vous avez renseigné existe déjà dans une autre structure').toJSON());
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
      // eslint-disable-next-line max-len
      const passwordValidation = Joi.string().required().regex(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{12,199})/).error(new Error('Le mot de passe ne correspond pas aux exigences de sécurité.')).validate(password);
      if (passwordValidation.error) {
        res.status(400).json(new BadRequest(passwordValidation.error));
        return;
      }
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
      app.service('users').patch(user._id,
        {
          password,
          passwordCreated: true,
          passwordCreatedAt: new Date(),
          token: null,
          tokenCreatedAt: null
        }
      );

      if (typeEmail === 'bienvenue') {
        try {
          if (user.roles.includes('conseiller')) {
            return app.get('mongoClient').then(async db => {
              const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
              const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
              const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
              const email = conseiller.emailCN.address;
              const login = email.substring(0, email.lastIndexOf('@'));
              const gandi = app.get('gandi');
              const mattermost = app.get('mattermost');
              await db.collection('users').updateOne({ _id: user._id }, {
                $set: {
                  name: email
                }
              });
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

              let message = emails.getEmailMessageByTemplateName('bienvenueCompteConseiller');
              await message.send(user, conseiller);

              // Envoi d'un deuxième email pour l'inscription à Pix Orga
              let messagePix = emails.getEmailMessageByTemplateName('pixOrgaConseiller');
              await messagePix.send(user, conseiller);
              res.send({ ...user, name: email });
            });
          }
          const nomTemplate = user.roles.includes('candidat') ? 'bienvenueCompteCandidat' : 'bienvenueCompteHub';
          const message = emails.getEmailMessageByTemplateName(nomTemplate);
          await message.send(user);
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
      }
      if (typeEmail === 'renouvellement') {
        try {
          if (user.roles.includes('conseiller')) {
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
          }
          if (user?.resetPasswordCnil) {
            app.get('mongoClient').then(async db => {
              const userUpdated = await db.collection('users').updateOne(
                {
                  _id: user._id
                },
                {
                  $unset: {
                    resetPasswordCnil: ''
                  }
                }
              );
              if (userUpdated.modifiedCount === 0) {
                app.get('sentry').captureException(new Error(`Erreur lors de la mise à jour du user ${user._id} pour le renouvellement du mot de passe`));
                logger.error(`Erreur lors de la mise à jour du user ${user._id} pour le renouvellement du mot de passe`);
              }
            });
          }
          const templateMail = user.roles.some(role => role === 'conseiller' || 'hub_coop') ? 'renouvellementCompte' : 'renouvellementCompteCandidat';
          const message = emails.getEmailMessageByTemplateName(templateMail);
          await message.send(user);
        } catch (err) {
          app.get('sentry').captureException(err);
          logger.error(err);
        }
      }
      res.send({ roles: user.roles });
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
        res.status(404).send(new NotFound('Cette adresse e-mail n\'existe pas', {
          username
        }).toJSON());
        return;
      }
      const user = users.data[0];
      let hiddenEmail = '';
      if (user.roles.includes('conseiller') && user.passwordCreated === false) {
        // eslint-disable-next-line max-len
        res.status(409).send(new Conflict(`Vous n'avez pas encore activé votre compte. Pour cela, cliquez sur le lien d'activation fourni dans le mail ayant pour objet "Activer votre compte Coop des Conseillers numériques"`, {
          username
        }).toJSON());
        return;
      }
      //Si le user est un conseiller, on renvoie l'email obscurci
      if (user.roles.includes('conseiller')) {
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
        res.status(404).send(new NotFound('Cette adresse e-mail n\'existe pas', {
          username
        }).toJSON());
        return;
      }
      const user = users.data[0];
      if (!user.roles.some(role => ['candidat', 'conseiller', 'hub_coop'].includes(role))) {
        res.status(403).send(new Forbidden('Error authorization user', {
          username
        }).toJSON());
        return;
      }
      if (user.passwordCreated === false) {
        res.status(400).send(new BadRequest('Error authorization forgottenPassword', {
          username
        }).toJSON());
        return;
      }
      user.token = uuidv4();

      //Si le user est un conseiller, envoyer le mail sur son email perso
      if (user.roles.includes('conseiller')) {
        let conseiller = await app.service('conseillers').get(user.entity?.oid);
        user.persoEmail = conseiller.email;
      }

      try {
        this.Model.updateOne({ _id: user._id }, { $set: { token: user.token, tokenCreatedAt: new Date() } });
        let message;
        if (user?.resetPasswordCnil) {
          message = emails.getEmailMessageByTemplateName('resetMotDePasseCnil');
        } else {
          message = emails.getEmailMessageByTemplateName('motDePasseOublie');
        }
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
      // eslint-disable-next-line max-len
      const passwordValidation = Joi.string().required().regex(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{12,199})/).error(new Error('Le mot de passe ne correspond pas aux exigences de sécurité.')).validate(password);
      if (passwordValidation.error) {
        res.status(400).json(new BadRequest(passwordValidation.error));
        return;
      }
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

    app.patch('/users/verify-code', async (req, res) => {
      const db = await app.get('mongoClient');
      const { code, email } = req.body;
      const schema = Joi.object({
        code: Joi.string().required().error(new Error('Le format du code de vérification est invalide')),
        email: Joi.string().trim().email().required().error(new Error('Le format de l\'adresse email est invalide')),
      }).validate(req.body);
      if (schema.error) {
        res.status(400).json(new BadRequest(schema.error));
        return;
      }
      try {
        const verificationEmailEtCode = await db.collection('users').countDocuments({ name: email.toLowerCase().trim(), numberLoginUnblock: Number(code) });
        if (verificationEmailEtCode === 0) {
          res.status(404).send(new Conflict('Erreur: l\'email et le code ne correspondent pas.').toJSON());
          return;
        }
        await db.collection('users')
        .updateOne(
          { name: email },
          { $unset: {
            lastAttemptFailDate: '',
            attemptFail: '',
            numberLoginUnblock: ''
          } }
        );
        res.status(200).json({ messageVerificationCode: 'Vous pouvez désormais vous reconnecter' });
        return;
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
        res.status(500).send(new GeneralError('Une erreur s\'est produite, veuillez réessayer plus tard.'));
        return;
      }
    });

    // Monitoring clever
    app.get('/', (req, res) => {
      res.sendStatus(200);
    });
  }
};
