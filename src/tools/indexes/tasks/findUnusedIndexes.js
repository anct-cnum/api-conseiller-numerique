module.exports = async db => {
  const collections = await db.listCollections().toArray();

  return (await Promise.all(
    collections
    .map(async collection => {
      const unusedIndexes = await db.collection(collection.name)
      .aggregate([
        { $indexStats: {} },
        { $match: { 'accesses.ops': { $eq: 0 } } },
      ])
      .toArray();

      Promise.all(
        unusedIndexes
        .filter(unusedIndex => unusedIndex.name !== '_id_')
        .map(unusedIndex => {
          console.log(`Suppression de l'index ${unusedIndex.name.replace('_1', '')} dans la collection ${collection.name}`);
          return db.collection(collection.name).dropIndex(unusedIndex.name);
        })
      );

      return { name: collection.name, indexes: unusedIndexes };
    })
  ));
};
