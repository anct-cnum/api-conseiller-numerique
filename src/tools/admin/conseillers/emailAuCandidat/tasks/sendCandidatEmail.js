let { delay } = require('../../../../utils');
const { v4: uuidv4 } = require('uuid');

module.exports = async (db, logger, emails, action, options, Sentry, exit) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  let cursor = db.collection('misesEnRelation').aggregate([
    ...action.getQuery()
  ]);

  cursor.batchSize(10);

  while (await cursor.hasNext()) {

    if (stats.sent === options.limit) {
      exit();
    }

    let conseillerAgg = await cursor.next();

    let conseiller = await db.collection('conseillers').findOne({ '_id': conseillerAgg._id });
    if (conseiller.sondageSentAt === undefined || conseiller.sondageSentAt === null) {
      let tokenRetourRecrutement = uuidv4();

      await db.collection('conseillers').updateOne({ '_id': conseillerAgg._id }, {
        $set: {
          sondageToken: tokenRetourRecrutement
        }
      });

      logger.info(`Sending email to candidate ${conseiller.email} - token ${tokenRetourRecrutement}`);
      stats.total++;
      try {
        let message = emails.getEmailMessageByTemplateName('candidatPointRecrutement');
        await message.send(conseiller);

        if (options.delay) {
          await delay(options.delay);
        }

        await db.collection('conseillers').updateOne({ '_id': conseillerAgg._id }, {
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
  }
  return stats;
};
