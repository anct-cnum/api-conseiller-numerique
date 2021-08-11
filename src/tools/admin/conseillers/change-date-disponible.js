const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-d, --disponible <type>', 'disoponible : entrer  la date de disponibilité du conseiller');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let disponible = program.disponible;
  disponible = new Date(disponible);

  if (id === 0 || !disponible) {
    exit('Paramètres invalides. Veuillez préciser un id et une date de disponibilité');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  await db.collection('conseillers').updateOne({ idPG: id }, { $set: { dateDisponibilite: disponible } });

  await db.collection('misesEnRelation').updateMany(
    { 'conseillerObj._id': new ObjectID(conseiller._id) },
    { $set: { 'conseillerObj.dateDisponibilite': disponible }
    });

  try {
    await pool.query(`UPDATE djapp_coach
      SET start_date = $2 WHERE id = $1`,
    [conseiller.idPG, disponible]);

  } catch (error) {
    logger.error(`Erreur DB : ${error.message}`);
    //a mettre erreur sentry ?
  }

  logger.info(`date mis à jour pour le conseiller avec l'idPG: ${conseiller.idPG}`);
  exit();
});
