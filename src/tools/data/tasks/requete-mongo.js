// ...............................................
// Consernant les STRUCTURES
// ...............................................
// const suffixe *******
const getTotalStructures = db => async query => await db.collection('structures').find({ ...query }).toArray();

const updateIdMongoStructure = db => async (id, dataAnonyme) => {
  await db.collection('structures').insertOne({ ...dataAnonyme });
  return await db.collection('structures').deleteOne({ _id: id });
};
const updateMiseEnrelationStructure = db => async (id, structureObj) =>
  await db.collection('misesEnRelation').updateMany({ 'structure.$id': id }, { $set: { ...structureObj } });

const getStructure = db => async id => await db.collection('structures').findOne({ _id: id });

const getUserStructure = db => async id => await db.collection('users').findOne({ 'entity.$id': id });

const updateUserStructure = db => async (idMongo, email, token, password) => await db.collection('users').updateOne({ _id: idMongo }, { $set: { name: email, token, password } });

const getUserMulticompteStructure = db => async (id, idMongoUserIgnore) =>
  await db.collection('users').find({ '_id': { $ne: idMongoUserIgnore }, 'entity.$id': id }).toArray();

const updateUserMulticompteStructure = db => async (id, idMongoUser, email, token, password) =>
  await db.collection('users').updateOne({ '_id': idMongoUser, 'entity.$id': id }, { $set: { name: email, token, password } });

const updateIdMongoStructureMisesEnRelation = db => async (idOriginal, newIdMongo) =>
  await db.collection('misesEnRelation').updateMany({ 'structure.$id': idOriginal }, { $set: { 'structure.$id': newIdMongo, 'structureObj._id': newIdMongo } });

const updateIdMongoStructureUser = db => async (idOriginal, newIdMongo) =>
  await db.collection('users').updateMany({ 'entity.$id': idOriginal }, { $set: { 'entity.$id': newIdMongo } });

const updateIdMongoStructureConseillerRecrute = db => async (idOriginal, newIdMongo) =>
  await db.collection('conseillers').updateMany({ 'structureId': idOriginal, 'statut': 'RECRUTE' }, { $set: { 'structureId': newIdMongo } });

const updateIdMongoStructureConseillerRupture = db => async (idOriginal, newIdMongo) =>
  await db.collection('conseillers').updateMany({ 'ruptures.$.structureId': idOriginal }, { $set: { 'ruptures.$.structureId': newIdMongo } });

// ...............................................
// Concernant les CONSEILLERS
// ...............................................

const getTotalConseillers = async db => await db.collection('conseillers').find({}).toArray();

const updateIdMongoConseiller = db => async (idOriginal, dataAnonyme) => {
  await db.collection('conseillers').insertOne({ ...dataAnonyme });
  return await db.collection('conseillers').deleteOne({ _id: idOriginal });
};

const getMiseEnrelationConseiller = db => async id => await db.collection('misesEnRelation').countDocuments({ 'conseiller.$id': id });

const updateMiseEnRelationConseiller = db => async (id, conseillerObj) =>
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': id }, { $set: { ...conseillerObj } });

const getUserConseiller = db => async id => await db.collection('users').findOne({ 'entity.$id': id });

const updateUserConseiller = db => async (idMongo, email, token, nom, prenom, password) =>
  await db.collection('users').updateOne({ _id: idMongo }, { $set: { name: email, token, nom, prenom, password } });

/// id mongodb update
const updateIdMongoConseillerMisesEnRelation = db => async (idOriginal, newIdMongo) =>
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerUser = db => async (idOriginal, newIdMongo) =>
  await db.collection('users').updateMany({ 'entity.$id': idOriginal }, { $set: { 'entity.$id': newIdMongo } });

const updateIdMongoConseillerCRAS = db => async (idOriginal, newIdMongo) =>
  await db.collection('cras').updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerStatsTerritoires = db => async (idOriginal, newIdMongo) =>
  await db.collection('stats_Territoires').updateMany({ 'conseillerIds': { $in: [idOriginal] } }, { $set: { 'conseillerIds.$': newIdMongo } });

const updateIdMongoStatsConseillersCras = db => async (idOriginal, newIdMongo) =>
  await db.collection('stats_conseillers_cras').updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerRuptures = db => async (idOriginal, newIdMongo) =>
  await db.collection('conseillersRuptures').updateMany({ 'conseillerId': idOriginal }, { $set: { 'conseillerId': newIdMongo } });

const updateIdMongoSondages = db => async (idOriginal, newIdMongo) =>
  await db.collection('sondages').updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

module.exports = {
  // Structures
  getTotalStructures,
  updateIdMongoStructure,
  updateMiseEnrelationStructure,
  getStructure,
  getUserStructure,
  updateUserStructure,
  updateUserMulticompteStructure,
  getUserMulticompteStructure,
  updateIdMongoStructureMisesEnRelation,
  updateIdMongoStructureUser,
  updateIdMongoStructureConseillerRecrute,
  updateIdMongoStructureConseillerRupture,
  // Conseillers
  getTotalConseillers,
  updateIdMongoConseiller,
  getMiseEnrelationConseiller,
  updateMiseEnRelationConseiller,
  getUserConseiller,
  updateUserConseiller,
  updateIdMongoConseillerMisesEnRelation,
  updateIdMongoConseillerUser,
  updateIdMongoConseillerCRAS,
  updateIdMongoConseillerStatsTerritoires,
  updateIdMongoStatsConseillersCras,
  updateIdMongoConseillerRuptures,
  updateIdMongoSondages
};
