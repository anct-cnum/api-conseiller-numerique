let { delay } = require('../../../utils');

module.exports = async (db, logger, emails, action, options, Sentry) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = db.collection('conseillers').aggregate([
    ...action.getQuery(options.limit)
  ]);

  cursor.batchSize(10);

  while (await cursor.hasNext()) {

    let candidat = await cursor.next();

    let conseiller = await db.collection('conseillers').findOne({ '_id': candidat._id });
    logger.info(`Sending email to candidate ${candidat.email}`);
    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('candidatPointRecrutement');
      await message.send(conseiller);

      if (options.delay) {
        await delay(options.delay);
      }
      stats.sent++;
    } catch (err) {
      Sentry.captureException(err);
      logger.error(err);
      stats.error++;
    }
  }
  return stats;
};
