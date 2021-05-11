let { delay } = require('../../../../utils');

module.exports = async (db, logger, emails, action, options = {}) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = await db.collection('misesEnRelation').find({
    ...action.getQuery(),
  });
  if (options.limit) {
    cursor.limit(options.limit);
  }
  cursor.batchSize(10);

  while (await cursor.hasNext()) {
    let miseEnRelation = await cursor.next();
    logger.info(`Sending email to candidate ${miseEnRelation.conseillerObj.email}`);

    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('candidatPointRecrutement');
      await message.send(miseEnRelation.conseillerObj);

      if (options.delay) {
        await delay(options.delay);
      }
      stats.sent++;
    } catch (err) {
      logger.error(err);
      stats.error++;
    }
  }
  return stats;
};
