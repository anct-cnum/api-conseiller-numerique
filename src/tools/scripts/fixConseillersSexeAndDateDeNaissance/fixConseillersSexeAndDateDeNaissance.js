const { execute } = require('../../utils');
const { setConseillerSexeAndDateDeNaissance } = require('../../../services/conseillers/create-sexe-age/repositories/conseiller.repository');

execute(__filename, async ({ db, logger, Sentry, exit }) => {
  try {
    const conseillers = await db.collection('conseillers').find({
      dateDeNaissance: { $ne: null },
      sexe: { $ne: null }
    }).toArray();

    await Promise.all(conseillers.map(async conseiller => {
      await setConseillerSexeAndDateDeNaissance(db)(conseiller._id, conseiller.sexe, conseiller.dateDeNaissance);
    }));
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    exit('db error');
  }

  // eslint-disable-next-line max-len
  logger.info('Les informations sur la date de naissance et le sexe des conseillers ont été mises à jour sur tous les doublons et toutes les mises en relations.');
  exit();
});
