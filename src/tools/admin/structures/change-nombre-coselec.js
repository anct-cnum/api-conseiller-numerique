const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  program.option('-n, --nombre <nombre>', 'nombre: un chiffre');
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let nombre = parseFloat(program.nombre);

  if (id === 0 || !nombre) {
    exit('Paramètres invalides. Veuillez préciser un id et un nombre');
    return;
  }
  const structure = await db.collection('structures').findOne({ idPG: id });

  if (structure === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  try {
    const arrayCoselec = structure.coselec;
    let index = arrayCoselec[arrayCoselec.length - 1];
    index.nombreConseillersCoselec = nombre;
    await db.collection('structures').updateOne({ idPG: id }, { $set: { coselec: arrayCoselec } });
    await db.collection('misesEnRelation').updateMany({ 'structureObj._id': new ObjectID(structure._id) }, { $set: { 'structureObj.coselec': arrayCoselec } });

  } catch (err) {
    logger.error(`Erreur Mongo pour modifier le nombre de Conseillers Coselec : ${err.message}`);
    Sentry.captureException(`Erreur Mongo pour modifier le nombre de Conseillers Coselec : ${err.message}`);
    return;
  }

  logger.info(`nombreConseillersCoselec mis à jour pour la structure avec l'idPG: ${structure.idPG}`);
  exit();
});
