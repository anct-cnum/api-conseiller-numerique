// ...............................................
// Consernant les STRUCTURES
// ...............................................

const getTotalStructures = db => async query => await db.collection('structures').find({ ...query }).toArray();

const updateStructure = db => async (id, dataAnonyme) =>
  await db.collection('structures').updateOne({ _id: id }, { $set: { ...dataAnonyme } });

const updateMiseEnrelationStructure = db => async (id, structureObj) =>
  await db.collection('misesEnRelation').updateMany({ 'structure.$id': id }, { $set: { ...structureObj } });

const getStructure = db => async id => await db.collection('structures').findOne({ _id: id });

const getUserStructure = db => async id => await db.collection('users').findOne({ 'entity.$id': id });

const updateUserStructure = db => async (idMongo, email, token) => await db.collection('users').updateOne({ _id: idMongo }, { $set: { name: email, token } });

const getUserMulticompteStructure = db => async (id, idMongoUserIgnore) =>
  await db.collection('users').find({ '_id': { $ne: idMongoUserIgnore }, 'entity.$id': id }).toArray();

const updateUserMulticompteStructure = db => async (id, idMongoUser, email, token) =>
  await db.collection('users').updateOne({ '_id': idMongoUser, 'entity.$id': id }, { $set: { name: email, token } });

// ...............................................
// Concernant les CONSEILLERS
// ...............................................

const getTotalConseillers = async db => await db.collection('conseillers').find({}).toArray();

const updateConseiller = db => async (id, dataAnonyme) =>
  await db.collection('conseillers').updateOne({ _id: id }, { $set: { ...dataAnonyme } });

const getMiseEnrelationConseiller = db => async id => await db.collection('misesEnRelation').countDocuments({ 'conseiller.$id': id });

const updateMiseEnRelationConseiller = db => async (id, conseillerObj) =>
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': id }, { $set: { ...conseillerObj } });

const getUserConseiller = db => async id => await db.collection('users').findOne({ 'entity.$id': id });

const updateUserConseiller = db => async (idMongo, email, token, nom, prenom) =>
  await db.collection('users').updateOne({ _id: idMongo }, { $set: { name: email, token, nom, prenom } });


module.exports = {
  // Structures
  getTotalStructures,
  updateStructure,
  updateMiseEnrelationStructure,
  getStructure,
  getUserStructure,
  updateUserStructure,
  updateUserMulticompteStructure,
  getUserMulticompteStructure,
  // Conseillers
  getTotalConseillers,
  updateConseiller,
  getMiseEnrelationConseiller,
  updateMiseEnRelationConseiller,
  getUserConseiller,
  updateUserConseiller
};
