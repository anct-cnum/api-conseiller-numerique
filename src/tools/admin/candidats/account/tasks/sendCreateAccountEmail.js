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
    logger.info(`Sending email to conseiller user ${user.name} (candidat)`);

    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('creationCompteCandidat');
      await message.send(user);

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
