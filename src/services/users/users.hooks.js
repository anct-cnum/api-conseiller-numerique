const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('feathers-permissions');
const { Forbidden, Conflict } = require('@feathersjs/errors');
const decode = require('jwt-decode');
const { v4: uuidv4 } = require('uuid');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const {
  hashPassword, protect
} = require('@feathersjs/authentication-local').hooks;

// protect : https://github.com/feathersjs-ecosystem/feathers-authentication-hooks / https://github.com/feathersjs-ecosystem/feathers-permissions
module.exports = {
  before: {
    all: [],
    find: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    get: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les users non admin ne peuvent voir que les informations les concernant
        if (context.params.authentication !== undefined) {
          const user = await getUserBytoken(context);
          let rolesUserAllowed = user?.roles.filter(role => ['admin'].includes(role));
          if (rolesUserAllowed.length < 1 && context.id.toString() !== user?._id.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    create: [
      hashPassword('password'),
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    update: [
      hashPassword('password'),
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les users non admin ne peuvent mettre à jour que les informations les concernant
        if (context.params.authentication !== undefined) {
          const user = await getUserBytoken(context);
          let rolesUserAllowed = user?.roles.filter(role => ['admin'].includes(role));
          if (rolesUserAllowed.length < 1 && context.id.toString() !== user?._id.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    patch: [
      hashPassword('password'),
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les users non admin ne peuvent mettre à jour que les informations les concernant
        if (context.params.authentication !== undefined) {
          const user = await getUserBytoken(context);
          let rolesUserAllowed = user?.roles.filter(role => ['admin'].includes(role));
          if (rolesUserAllowed.length < 1 && context.id.toString() !== user?._id.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
        context.app.get('mongoClient').then(async db => {
          const nouveauEmail = context?.data?.name;
          const idUser = context?.params?.user?._id;

          const verificationEmail = await db.collection('users').countDocuments({ name: nouveauEmail });
          if (verificationEmail !== 0) {
            throw new Conflict('Erreur: l\'email est déjà utilisé par une autre structure');
          } else {
            await db.collection('users').updateOne({ _id: idUser }, { $set: { token: uuidv4() } });
            try {
              const user = await db.collection('users').findOne({ _id: idUser });
              user.nouveauEmail = nouveauEmail;
              let mailer = createMailer(context.app, nouveauEmail);
              const emails = createEmails(db, mailer);
              let message = emails.getEmailMessageByTemplateName('confirmeNouveauEmail');
              await message.render(user);
              await message.send(user, nouveauEmail);

            } catch (error) {
              context.app.get('sentry').captureException(error);
            }
            await db.collection('users').updateOne({ _id: idUser }, { $set: { name: context?.params?.user?.name } });
            return;
          }

        });
      }
    ],
    remove: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
  },

  after: {
    all: [
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect('password')
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};

//Get User by Token
function getUserBytoken(context) {
  let userId = decode(context.params.authentication.accessToken).sub;
  const user = context.app.service('users').get(userId);
  return user;
}
