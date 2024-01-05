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
          const isBlocked = await db.collection('users').countDocuments({
            name: context.data.name,
            attempFail: 3,
            lastAttemptFailDate: { $gt: new Date().getTime() - 600000
            } });
          if (isBlocked) {
            context.error = new Forbidden('ERROR_ATTEMPT_LOGIN');
            throw new Error(context);
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

            const user = await db.collection('users').findOne({ name: context.data.name });
            if (user?.attemptFail === 3) {
              user.numberLoginUnblock = Math.floor(100000 + Math.random() * 900000);
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
              const conum = await db.collection('conseillers').findOne({ _id: user?.entity.oid });
              let message = emails.getEmailMessageByTemplateName('codeVerificationMotDePasseConseiller');
              await message.send(user, conum.email);
              throw new Error('PROCESS_LOGIN_UNBLOCKED');
            }

            await db.collection('accessLogs')
            .insertOne({ name: context.data.name, createdAt: new Date(), ip: context.params.ip });
            await db.collection('users')
            .updateOne({ name: context.data.name }, { $set: { lastLogin: new Date() } });

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
              return;
            }
            let attemptFail = user?.attemptFail ?? 0;
            if (attemptFail < 3) {
              attemptFail++;
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
            } else if (attemptFail === 3 && context.error.message !== 'Error: PROCESS_LOGIN_UNBLOCKED') {
              await db.collection('users')
              .updateOne(
                {
                  _id: user._id
                },
                { $set: {
                  lastAttemptFailDate: new Date(),
                }
                });
              context.error = new Forbidden('ERROR_ATTEMPT_LOGIN', { attemptFail: attemptFail });
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
