const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, exit }) => {

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

  try {
    await pool.query(`DELETE FROM djapp_hostorganization WHERE id = $1`, [structure.idPG]);
  } catch (error) {
    logger.info(`Erreur DB : ${error.message}`);
  }

  logger.info(`La structure avec l'idPG: ${structure.idPG} est supprimée `);
  exit();
});
