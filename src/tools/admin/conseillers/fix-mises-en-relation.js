const { execute } = require('../../utils');
const { isEqual } = require('lodash');
const { program } = require('commander');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-c, --collection <collection>', 'collection: conseillers ou structures');
  program.option('-i, --id <id>', 'id: idPG d\'un conseiller ou une structure ');
  program.helpOption('-h', 'HELP command');
  program.parse(process.argv);

  const collection = program.collection;
  const id = ~~program.id;
  const query = id ? { idPG: id } : {};
  let promises = [];
  let countTotalConseiller = 0;
  let countExistsMER = 0;
  let countMAJ = 0;

  if (!collection) {
    exit('Paramètres invalides. Veuillez préciser une collection');
    return;
  } else if (!['conseillers', 'structures'].includes(collection)) {
    exit('collection invalide. Veuillez choisir entre conseillers ou structures');
    return;
  }
  // eslint-disable-next-line max-len
  logger.info(`MAJ de tous les mises en relation de ${!id ? `de tous les ${collection}` : `1 ${collection === 'conseillers' ? 'conseiller' : 'strcutres'} idPG: ${id}`}`);
  const arrayData = await db.collection(collection).find(query).toArray();

  arrayData.forEach(obj => {
    promises.push(new Promise(async resolve => {
      const match = collection === 'conseillers' ? { 'conseiller.$id': obj._id } : { 'structure.$id': obj._id };
      const updateObj = collection === 'conseillers' ? { 'conseillerObj': obj } : { 'structureObj': obj };
      const verifMisesEnRelation = await db.collection('misesEnRelation').findOne(match);
      const checkObj = collection === 'conseillers' ? verifMisesEnRelation?.conseillerObj : verifMisesEnRelation?.structureObj;

      if (verifMisesEnRelation !== null) {
        countExistsMER++;
        if (!isEqual(checkObj, obj)) {
          await db.collection('misesEnRelation').updateMany(match, { $set: updateObj });
          countMAJ++;
        }
      }
      countTotalConseiller++;
      resolve();
    }));
  });
  await Promise.all(promises);
  // eslint-disable-next-line max-len
  logger.info(`${countTotalConseiller} ${collection} ont été traitées, ${countExistsMER} ${collection} qui ont au moins une misesEnRelation && ${countMAJ} qui n'était pas à jour dans les misesEnRelations.`);

  exit();
});
