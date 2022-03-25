const { program } = require('commander');
const { execute } = require('../../utils');

const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-d, --disponible <type>', 'disponible : true ou false');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let disponible = program.disponible;

  if (id === 0 || !disponible) {
    exit('Paramètres invalides. Veuillez préciser un id et la disponibilité en true ou false');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  // Update dans PG
  try {
    await pool.query(`UPDATE djapp_coach
        SET disponible = $2 WHERE id = $1`,
    [conseiller.idPG, disponible]);

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  //Update dans MongoDb
  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { disponible } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: {
        'conseillerObj.disponible': disponible,
        'statut': 'nouvelle'
      }
      });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }


  logger.info(`Le conseiller avec l'idPG: ${conseiller.idPG} mise à jour de son disponible à ${disponible}`);
  exit();
});
