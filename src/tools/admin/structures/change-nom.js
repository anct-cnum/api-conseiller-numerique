const { program } = require('commander');
const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  program.option('-n, --nom <nom>', 'nom: nouveau nom');
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let nouveauNom = program.nom;

  if (!id || !nouveauNom) {
    exit('Paramètres invalides. Veuillez préciser un id et le nouveau à modifier');
    return;
  }
  const structure = await db.collection('structures').findOne({ idPG: id });

  if (structure === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  try {
    await db.collection('structures').updateOne({ idPG: id }, { $set: { nom: nouveauNom } });
    await db.collection('misesEnRelation').updateMany({ 'structureObj._id': structure._id }, { $set: { 'structureObj.nom': nouveauNom } });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Nom bien mis à jour avec comme nom: ${nouveauNom} (ancien nom: ${structure.nom})`);
  exit();
});
