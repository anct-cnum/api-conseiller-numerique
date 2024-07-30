const { execute } = require('../../utils');
const isEqual = require('lodash.isequal');

execute(__filename, async ({ db, logger, exit }) => {
  let promises = [];
  let countTotalStructure = 0;
  let countActionMAJ = 0;
  let countNonMAJ = 0;

  const structures = await db.collection('structures').find().toArray();

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      const verifMisesEnRelation = await db.collection('misesEnRelation').findOne({ 'structure.$id': structure._id });
      if (verifMisesEnRelation !== null) {
        if (!isEqual(verifMisesEnRelation?.structureObj, structure)) {
          await db.collection('misesEnRelation').updateMany(
            { 'structure.$id': structure._id },
            { $set: { 'structureObj': structure }
            });
          countNonMAJ++;
        }
        countActionMAJ++;
      }
      countTotalStructure++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${countTotalStructure} structures ont été traitées, ${countActionMAJ} structures qui ont au moins une misesEnRelation && ${countNonMAJ} qui n'était pas à jour dans les misesEnRelations `);

  exit();
});
