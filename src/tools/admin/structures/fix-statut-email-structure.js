const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {
  let promises = [];
  let countTotalStructure = 0;
  let countActionMAJ = 0;

  const structures = await db.collection('structures').find().toArray();

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      const verifMisesEnRelation = await db.collection('misesEnRelation').findOne({ 'structure.$id': structure._id });
      if (verifMisesEnRelation !== null) {
        if (verifMisesEnRelation?.structureObj?.contact !== undefined) {
          // eslint-disable-next-line max-len
          if ((verifMisesEnRelation.structureObj.statut !== structure?.statut) || (verifMisesEnRelation.structureObj.contact.email !== structure.contact.email)) {
            await db.collection('misesEnRelation').updateMany(
              { 'structure.$id': structure._id },
              { $set: { 'structureObj': structure }
              });
            countActionMAJ++;
          }
        }
      }
      countTotalStructure++;
      resolve();
    }));
  });
  await Promise.all(promises);

  // eslint-disable-next-line max-len
  logger.info(`${countTotalStructure} structures ont été traitées, ${countActionMAJ} structures qui ont au moins une misesEnRelation et qui n'était pas à jour dans les misesEnRelations à été modifié`);

  exit();
});
