const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');

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

  logger.info(`La structure avec l'idPG: ${structure.idPG} est supprimée avec succès`);
  exit();
});
