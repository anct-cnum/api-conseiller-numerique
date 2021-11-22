const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-distance, --distance <distance>', 'distance max en km : 5 ou 10 ou 15 ou 20 ou 40 ou 100 ou 2000 (France entière)');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let distance = program.distance;

  if (id === 0 || !distance) {
    exit('Paramètres invalides. Veuillez préciser un id et un nombre en kilomètre');
    return;
  } else if (!['5', '10', '15', '20', '40', '100', '2000'].includes(distance)) {
    exit('distance invalide. Veuillez préciser nombre qui est égal à 5 ou 10 ou 15 ou 20 ou 40 ou 100 ou 2000 (France entière)');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  distance = parseInt(distance, 10);
  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { distanceMax: distance } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: { 'conseillerObj.distanceMax': distance }
      });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  try {
    await pool.query(`UPDATE djapp_coach
      SET max_distance = $2 WHERE id = $1`,
    [id, distance]);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`distance géographique mise à jour de ${conseiller.distanceMax} km par ${distance} km pour le conseiller idPG: ${id}`);
  exit();
});
