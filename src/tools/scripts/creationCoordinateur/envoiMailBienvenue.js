const { execute, delay } = require('../../utils');

execute(__filename, async ({ db, emails, logger, exit, Sentry }) => {

  logger.info('Début du script d\'envoi de mail aux nouveau coordinateur.');

  let cursor = await db.collection('users').find({
    'roles': { '$in': ['coordinateur_coop'] },
    'mailCoordinateurSent': { '$exists': false }
  });

  if (!await cursor.hasNext()) {
    logger.info('Il n\'y a pas de nouveau coordinateur.');
  } else {
    while (await cursor.hasNext()) {
      let coordinateur = await cursor.next();
      logger.info(`Envoi de mail au nouveau coordinateur ${coordinateur.name}`);
      try {
        const message = emails.getEmailMessageByTemplateName('bienvenueCompteCoordinateur');
        await message.send(coordinateur.name, coordinateur._id);
        await delay(1000);
      } catch (error) {
        Sentry.captureException(error);
        logger.error(error);
      }
      await delay(1000);
    }
  }

  logger.info('Fin du script d\'envoi de mail aux nouveau coordinateur.');
  exit();
});
