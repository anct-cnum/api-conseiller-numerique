const { program } = require('commander');
const { execute } = require('../../utils');

// node src/tools/admin/structures/change-statut.js

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
  logger.info('Statut mis à jour');

  const contUsers = await db.collection('users').countDocuments({ 'entity.$id': structure._id });
  const countMisesEnRelation = await db.collection('misesEnRelation').countDocuments({
    'structure.$id': structure._id,
    'statut': { $in: ['nouvelle', 'interessee', 'nonInteressee', 'recrutee'] }
  });
  if (contUsers > 0 || countMisesEnRelation > 0) {
    logger.warn(`Veuillez lancez le script "src/tools/scripts/remove-user-structure-inactif.js"`);
    logger.info(`Car la structure ${id} contient ${countMisesEnRelation} mises en relation & ${contUsers} users`);
  }
  exit();
});
