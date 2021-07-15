const usersHooks = require('../../../../../services/users/users.hooks');
let { delay } = require('../../../../utils');

module.exports = async (db, logger, emails, Sentry, action, options = {}) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = await db.collection('users').find({
    ...action.getQuery(),
  });
  if (options.limit) {
    cursor.limit(options.limit);
  }
  cursor.batchSize(10);

  while (await cursor.hasNext()) {
    let user = await cursor.next();
    logger.info(`Sending email to conseiller user ${user.name}`);

    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('creationCompteConseiller');
      await message.send(user);

      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      message = emails.getEmailMessageByTemplateName('ouvertureEspaceCoopStructure');
      await message.send(structure);

      if (options.delay) {
        await delay(options.delay);
      }
      stats.sent++;
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err);
      stats.error++;
    }
  }
  return stats;
};
