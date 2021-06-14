const { program } = require('commander');
const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-s, --statut <email>', 'statut: ANNULEE ou DOUBLON');
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let statut = program.statut;

  if (id === 0 || !statut) {
    exit('Paramètres invalides. Veuillez préciser un id et un staut');
    return;
  } else if (statut !== 'ANNULEE' && statut !== 'DOUBLON') {
    exit('Statut invalides. Veuillez préciser un statut qui est égale à ANNULEE ou DOUBLON');
    return;
  }

  const structures = await db.collection('structures').findOne({ idPG: id });

  if (structures.length === 0) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  await db.collection('structures').updateOne({ idPG: id }, { $set: { statut: statut } }, {});

  logger.info('Statut mis à jour');
  exit();
});
