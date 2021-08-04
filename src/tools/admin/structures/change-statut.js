const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-s, --statut <statut>', 'statut: ANNULEE ou DOUBLON ou ABANDON');
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let statut = program.statut;

  if (id === 0 || !statut) {
    exit('Paramètres invalides. Veuillez préciser un id et un statut');
    return;
  } else if (!['ANNULEE', 'DOUBLON', 'ABANDON'].includes(statut)) {
    exit('Statut invalide. Veuillez préciser un statut qui est égal à ANNULEE ou DOUBLON ou ABANDON');
    return;
  }

  const structure = await db.collection('structures').findOne({ idPG: id });

  if (structure.length === 0) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  await db.collection('structures').updateOne({ idPG: id }, { $set: { statut: statut } }, {});

  if (structure.userCreated === true) {
    await db.collection('users').updateOne({ 'entity.$id': new ObjectID(structure._id) }, { $set: { password: null } }, {});
  }

  logger.info('Statut mis à jour');
  exit();
});
