module.exports = async db => {
  let collections = await db.listCollections().toArray();

  return Promise.all(
    collections
    .filter(collection => collection.idIndex)
    .map(collection => db.collection(collection.name).dropIndexes())
  );
};
