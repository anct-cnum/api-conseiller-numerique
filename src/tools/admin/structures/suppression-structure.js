const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  program.option('-i, --id <id>', 'idPG: idPG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;

  if (id === 0) {
    exit('Paramètres invalides. Veuillez préciser un id');
    return;
  }

  const structure = await db.collection('structures').findOne({ idPG: id });

  if (structure === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  await db.collection('structures').deleteOne({ idPG: id });

  await db.collection('misesEnRelation').deleteMany({ 'structureObj._id': new ObjectID(structure._id) });

  logger.info(`La structure avec l'idPG: ${structure.idPG} est supprimée dans mongoDB`);

  try {
    await pool.query(`DELETE FROM djapp_matching WHERE host_id = $1`, [structure.idPG]);
  } catch (error) {
    logger.error(`Erreur PG pour supprimer dans la table djapp_matching : ${error.message}`);
    Sentry.captureException(`Erreur PG pour supprimer dans la table djapp_matching (id: ${structure.idPG}): ${error.message}`);
    return;
  }

  try {
    await pool.query(`DELETE FROM djapp_hostorganization WHERE id = $1`, [structure.idPG]);
    logger.info(`La structure avec l'id: ${structure.idPG} est supprimée dans PostgreSQL`);
  } catch (error) {
    logger.error(`Erreur PG pour supprimer dans la table djapp_hostorganization: ${error.message}`);
    Sentry.captureException(`Erreur PG pour supprimer dans la table djapp_hostorganization (id: ${structure.idPG}) : ${error.message}`);
    return;
  }

  logger.info(`La structure avec l'idPG: ${structure.idPG} est supprimée avec succès`);
  exit();
});
