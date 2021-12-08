require('dotenv').config();
const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, Sentry, exit }) => {
  try {
    await db.collection('conseillers').updateMany({
      $or: [
        { dateDeNaissance: { $lte: new Date('1920-01-01T00:00:00.000Z') } },
        { dateDeNaissance: { $gte: new Date('2000-01-01T00:00:00.000Z') } }
      ]
    }, {
      $unset: { dateDeNaissance: '', sexe: '' }
    });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    exit('db error');
  }

  logger.info(`Les informations de la date de naissance et du sexe des conseillers avec une date de naissance invalide ont été supprimées`);
  exit();
});
