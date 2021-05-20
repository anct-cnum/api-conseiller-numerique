let { delay } = require('../../../../utils');

module.exports = async (logger, emails, candidats, delay, Sentry) => {

  let stats = {
    total: 0,
    sent: 0,
    error: 0,
  };

  candidats.forEach(candidat => {
    stats.total++;
    /*
    try {
      logger.info(`Sending email to candidate ${candidat.email}`);
      let message = emails.getEmailMessageByTemplateName('candidatPixEnAttente');
      message.send(candidat);

      if (options.delay) {
        delay(options.delay);
      }
      stats.sent++;
    } catch (err) {

      Sentry.captureException(err);
      logger.error(err);
      stats.error++;
    }
    return stats;*/
    console.log(candidat);
  });

};
