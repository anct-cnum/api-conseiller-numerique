let { delay } = require('../../../../utils');

module.exports = async (db, logger, emails, candidats, optionDelais, Sentry) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = await db.collection('conseillers').find({ '_id': { $in: candidats } });

  cursor.batchSize(10);

  while (await cursor.hasNext()) {
    let candidat = await cursor.next();
    logger.info(`Sending email to candidate ${candidat.email}`);

    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('candidatPixEnAttente');
      await message.send(candidat);

      if (optionDelais) {
        await delay(optionDelais);
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
