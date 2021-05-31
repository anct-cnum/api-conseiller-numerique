let { delay } = require('../../../../utils');
const { v4: uuidv4 } = require('uuid');

module.exports = async (db, logger, emails, action, options, Sentry) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = db.collection('misesEnRelation').aggregate([
    ...action.getQuery(options.limit)
  ]);

  cursor.batchSize(10);

  while (await cursor.hasNext()) {

    let tokenRetourRecrutement = uuidv4();
    let miseEnRelation = await cursor.next();

    await db.collection('conseillers').updateOne({ '_id': miseEnRelation._id }, {
      $set: {
        emailConfirmationKey: tokenRetourRecrutement
      }
    });

    let conseiller = await db.collection('conseillers').findOne({ '_id': miseEnRelation._id });
    logger.info(`Sending email to candidate ${conseiller.email} - token ${tokenRetourRecrutement}`);
    //Être sûr d'envoyer le bon token
    conseiller.emailConfirmationKey = tokenRetourRecrutement;
    stats.total++;
    try {
      let message = emails.getEmailMessageByTemplateName('candidatPointRecrutement');
      await message.send(conseiller);

      if (options.delay) {
        await delay(options.delay);
      }
      
      await db.collection('conseillers').updateOne({ '_id': miseEnRelation._id }, {
        $set: {
          sondageSentAt: new Date()
        }
      });
      
      stats.sent++;
    } catch (err) {
      Sentry.captureException(err);
      logger.error(err);
      stats.error++;
    }
  }
  return stats;
};
