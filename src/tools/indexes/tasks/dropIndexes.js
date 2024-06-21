module.exports = async db => {
  const collections = await db.listCollections().toArray();

  return Promise.all(
    collections
    .filter(collection => collection.idIndex)
    .map(collection => db.collection(collection.name).dropIndexes())
  );
};
