// Application hooks that run for every service

const { Forbidden } = require('@feathersjs/errors');
const createEmails = require('./emails/emails');
const createMailer = require('./mailer');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      async context => {
        try {
          const db = await context.app.get('mongoClient');
          const user = await db.collection('users').findOne({ name: context.data.name });
          // 10 min de différence
          const difference = (new Date().getTime() - user?.lastAttemptFailDate.getTime()) < 600000;
          if (user?.attemptFail === 3 && difference) {
            context.error = new Forbidden('ERROR_ATTEMPT_LOGIN_BLOCKED');
            throw new Error(context);
          } else if (user?.attemptFail === 3 && !difference) {
            let numberLoginUnblock = '';
            for (let i = 0; i < 6; i++) {
              numberLoginUnblock += String(Math.floor(Math.random() * 10));
            }
            user.numberLoginUnblock = Number(numberLoginUnblock);
            await db.collection('users')
            .updateOne(
              {
                _id: user._id
              },
              { $set: {
                numberLoginUnblock: user.numberLoginUnblock,
              }
              });
            let mailer = createMailer(context.app);
            const emails = createEmails(db, mailer);
            let message = emails.getEmailMessageByTemplateName('codeVerificationMotDePasseConseiller');
            await message.send(user);
            throw new Error('PROCESS_LOGIN_UNBLOCKED');
          }
          return context;
        } catch (error) {
          throw new Error(error);
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async context => {
        try {
          if (context.data.strategy === 'local') {
            const db = await context.app.get('mongoClient');
            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, createdAt: new Date(), ip: context.params.ip });
            await db.collection('users')
            .updateOne({ name: context.data.name }, { $set: { lastLogin: new Date(), attemptFail: 3 } });
          }
        } catch (error) {
          throw new Error(error);
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [
      async context => {
        try {
          if (context.data.strategy === 'local') {
            const db = await context.app.get('mongoClient');
            const user = await db.collection('users').findOne({ name: context.data.name });
            if (user?.resetPasswordCnil === true) {
              context.error = new Forbidden('RESET_PASSWORD_CNIL', { resetPasswordCnil: true });
            }
            let attemptFail = user?.attemptFail ?? 0;
            if (attemptFail < 3) {
              attemptFail += 1;
              await db.collection('users')
              .updateOne(
                {
                  _id: user._id
                },
                { $set: {
                  attemptFail: attemptFail,
                  lastAttemptFailDate: new Date(),
                }
                });
              context.error = new Forbidden('ERROR_ATTEMPT_LOGIN', { attemptFail: attemptFail });
            } else if (attemptFail === 3 && !user?.numberLoginUnblock) {
              await db.collection('users')
              .updateOne(
                {
                  _id: user._id
                },
                { $set: {
                  lastAttemptFailDate: new Date(),
                }
                });
              context.error = new Forbidden('ERROR_ATTEMPT_LOGIN_BLOCKED');
            } else if (context.error.message === 'Error: PROCESS_LOGIN_UNBLOCKED') {
              context.error = new Forbidden('PROCESS_LOGIN_UNBLOCKED', { openPopinVerifyCode: true });
            }
            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, createdAt: new Date(), ip: context.params.ip, connexionError: true });
          }
        } catch (error) {
          throw new Error(error);
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  }
};

