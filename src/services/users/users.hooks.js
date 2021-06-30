const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('feathers-permissions');
const { Forbidden, GeneralError } = require('@feathersjs/errors');
const decode = require('jwt-decode');

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
        console.log('context:', context?.params?.user?.name);
        //Restreindre les permissions : les users non admin ne peuvent mettre à jour que les informations les concernant
        if (context.params.authentication !== undefined) {
          const user = await getUserBytoken(context);
          let rolesUserAllowed = user?.roles.filter(role => ['admin'].includes(role));
          if (rolesUserAllowed.length < 1 && context.id.toString() !== user?._id.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
          context.app.get('mongoClient').then(async db => {
            // j'ai voulue mettre countDocuments() mais ça me renvoyer ça comme erreur alors que tout fonctionne pourtant !
            //error: Unhandled Rejection at: Promise
            const verificationEmail = await db.collection('users').find({ name: context?.data?.name }).count();
            if (verificationEmail !== 0) {
              throw new GeneralError('l\'email est déjà utiliser par une autre structure validée Coselec');
            }
            // partie pour vérifier si dans la collection structure il y a le meme "ancien" email et si oui il le update
            const miseAJourEmail = await db.collection('structures').find({ 'contact.email': context?.params?.user?.name }).count();
            if (miseAJourEmail !== 0) {
              await db.collection('structures').updateOne({ 'contact.email': context?.params?.user?.name }, { $set: { 'contact.email': context?.data?.name } });
            }

          });
        }
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
