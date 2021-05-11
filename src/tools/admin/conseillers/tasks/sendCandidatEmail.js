let { delay } = require('../../../../utils');
const { v4: uuidv4 } = require('uuid');

module.exports = async (db, logger, emails, action, options = {}) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  /* Besoin d'un distinct sur conseiller */
  let cursor = await db.collection('misesEnRelation').find({
    ...action.getQuery(),
  });
  if (options.limit) {
    cursor.limit(options.limit);
  }
  cursor.batchSize(10);

  while (await cursor.hasNext()) {

    let tokenRetourRecrutement = uuidv4();
    let miseEnRelation = await cursor.next();
    let conseiller = await db.collection('conseillers').patch(miseEnRelation.conseillerObj._id, { tokenRetourRecrutement: tokenRetourRecrutement });

    logger.info(`Sending email to candidate ${conseiller.email}`);

    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('candidatPointRecrutement');
      await message.send(conseiller);

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
