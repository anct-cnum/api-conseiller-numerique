const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');
const { getCoselecPositif } = require('../../../utils/index');

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
    const arrayCoselecActuel = structure.coselec;
    const dernierObjCoselec = getCoselecPositif(structure);
    const autreObjCoselec = arrayCoselecActuel.filter(id => id !== dernierObjCoselec);
    dernierObjCoselec.nombreConseillersCoselec = nombre;
    autreObjCoselec.push(dernierObjCoselec);


    await db.collection('structures').updateOne({ idPG: id }, { $set: { coselec: autreObjCoselec } });
    await db.collection('misesEnRelation').updateMany({
      'structureObj._id': new ObjectID(structure._id) },
    {
      $set: { 'structureObj.coselec': autreObjCoselec
      } });

  } catch (err) {
    logger.error(`Erreur Mongo pour modifier le nombre de Conseillers Coselec : ${err.message}`);
    Sentry.captureException(err);
    return;
  }

  logger.info(`nombreConseillersCoselec mis à jour pour la structure avec l'idPG: ${structure.idPG}`);
  exit();
});
