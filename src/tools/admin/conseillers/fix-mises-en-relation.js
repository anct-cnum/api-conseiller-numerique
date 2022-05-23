const { execute } = require('../../utils');
const { isEqual } = require('lodash');
const { program } = require('commander');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-o, --option <option>', 'option: conseillers ou structures');
  program.helpOption('-h', 'HELP command');
  program.parse(process.argv);

  const option = program.option;
  let promises = [];
  let countTotalConseiller = 0;
  let countActionMAJ = 0;
  let countNonMAJ = 0;

  if (!option) {
    exit('Paramètres invalides. Veuillez préciser une option');
    return;
  } else if (!['conseillers', 'structures'].includes(option)) {
    exit('option invalide. Veuillez choisir entre conseillers ou structures');
    return;
  }

  const arrayData = await db.collection(option).find().toArray();

  arrayData.forEach(obj => {
    promises.push(new Promise(async resolve => {
      const match = option === 'conseillers' ? { 'conseiller.$id': obj._id } : { 'structure.$id': obj._id };
      const updateObj = option === 'conseillers' ? { 'conseillerObj': obj } : { 'structureObj': obj };
      const verifMisesEnRelation = await db.collection('misesEnRelation').findOne(match);
      const checkObj = option === 'conseillers' ? verifMisesEnRelation?.conseillerObj : verifMisesEnRelation?.structureObj;
      
      if (verifMisesEnRelation !== null) {
        if (!isEqual(checkObj, obj)) {
          await db.collection('misesEnRelation').updateMany(match, { $set: { updateObj } });
          countNonMAJ++;
        }
        countActionMAJ++;
      }
      countTotalConseiller++;
      resolve();
    }));
  });
  await Promise.all(promises);
  // eslint-disable-next-line max-len
  logger.info(`${countTotalConseiller} ${option} ont été traitées, ${countActionMAJ} ${option} qui ont au moins une misesEnRelation && ${countNonMAJ} qui n'était pas à jour dans les misesEnRelations `);

  exit();
});
