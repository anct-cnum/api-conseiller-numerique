const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();
const dayjs = require('dayjs');

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-d, --disponible <type>', 'disponible : entrer  la date de disponibilité du conseiller sous ce format AAAA/MM/DD');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let dispo = program.disponible;
  let disponible = dayjs(dispo, 'YYYY-MM-DD').toDate();

  if (id === 0 || !disponible) {
    exit('Paramètres invalides. Veuillez préciser un id et une date de disponibilité');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  //Update dans MongoDb
  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { dateDisponibilite: disponible } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseillerObj._id': conseiller._id },
      { $set: { 'conseillerObj.dateDisponibilite': disponible }
      });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  // Update dans PG
  try {
    await pool.query(`UPDATE djapp_coach
      SET start_date = $2 WHERE id = $1`,
    [conseiller.idPG, disponible]);

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`date mis à jour pour le conseiller avec l'idPG: ${conseiller.idPG} pour une date de disponibilté à partir du ${dispo} (format: AAAA/MM/DD)`);
  exit();
});
