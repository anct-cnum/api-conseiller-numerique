const { execute, delay } = require('../../utils');

execute(__filename, async ({ db, emails, logger, exit, Sentry }) => {

  logger.info('Début du script d\'envoi de mail aux nouveau coordinateur.');
  let cursor = await db.collection('users').find({
    'roles': { '$in': ['coordinateur_coop'] },
    'mailCoordinateurSended': { '$exists': false }
  });
  if (!await cursor.hasNext()) {
    logger.info('Il n\'y a pas de nouveau coordinateur.');
  }
  while (await cursor.hasNext()) {
    let coordinateur = await cursor.next();
    logger.info(`Envoi de mail aux nouveau coordinateur ${coordinateur.name}`);
    try {
      const message = emails.getEmailMessageByTemplateName('bienvenueCompteCoordinateur');
      await message.send(coordinateur.name);
      await delay(1000);
      await db.collection('users').updateOne(
        { '_id': coordinateur._id },
        { $set: { 'mailCoordinateurSended': true } });
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
    }

  }

  logger.info('Fin du script d\'envoi de mail aux nouveau coordinateur.');
  exit();
});
