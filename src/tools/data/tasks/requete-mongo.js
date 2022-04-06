// ...............................................
// Consernant les STRUCTURES
// ...............................................
const suffix = '_faker';

const getTotalStructures = db => async query => await db.collection(`structures${suffix}`).find({ ...query }).toArray();

const updateIdMongoStructure = db => async (id, dataAnonyme) => {
  await db.collection(`structures${suffix}`).insertOne({ ...dataAnonyme });
  return await db.collection(`structures${suffix}`).deleteOne({ _id: id });
};
const updateMiseEnrelationStructure = db => async (id, structureObj) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'structure.$id': id }, { $set: { ...structureObj } });

const getStructure = db => async id => await db.collection(`structures${suffix}`).findOne({ _id: id });

const getUserStructure = db => async id => await db.collection(`users${suffix}`).findOne({ 'entity.$id': id });

const updateUserStructure = db => async (idMongo, email, token, password, tokenCreatedAt) =>
  await db.collection(`users${suffix}`).updateOne({ _id: idMongo }, { $set: { name: email, token, password, tokenCreatedAt } });

const getUserMulticompteStructure = db => async (id, idMongoUserIgnore) =>
  await db.collection(`users${suffix}`).find({ '_id': { $ne: idMongoUserIgnore }, 'entity.$id': id }).toArray();

const updateUserMulticompteStructure = db => async (id, idMongoUser, email, token, password, tokenCreatedAt) =>
  await db.collection(`users${suffix}`).updateOne({ '_id': idMongoUser, 'entity.$id': id }, { $set: { name: email, token, password, tokenCreatedAt } });

const updateIdMongoStructureMisesEnRelation = db => async (idOriginal, newIdMongo) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'structure.$id': idOriginal }, { $set: { 'structure.$id': newIdMongo, 'structureObj._id': newIdMongo } });

const updateIdMongoStructureUser = db => async (idOriginal, newIdMongo) =>
  await db.collection(`users${suffix}`).updateMany({ 'entity.$id': idOriginal }, { $set: { 'entity.$id': newIdMongo } });

const updateIdMongoStructureConseillerRecrute = db => async (idOriginal, newIdMongo) =>
  await db.collection(`conseillers${suffix}`).updateMany({ 'structureId': idOriginal, 'statut': 'RECRUTE' }, { $set: { 'structureId': newIdMongo } });

const updateIdMongoStructureConseillerRupture = db => async (idOriginal, newIdMongo) =>
  await db.collection(`conseillers${suffix}`).updateMany({ 'ruptures.structureId': idOriginal }, { $set: { 'ruptures.$.structureId': newIdMongo } });

// ...............................................
// Concernant les CONSEILLERS
// ...............................................

const getTotalConseillers = async db => await db.collection(`conseillers${suffix}`).find({}).toArray();

const updateIdMongoConseiller = db => async (idOriginal, dataAnonyme) => {
  await db.collection(`conseillers${suffix}`).insertOne({ ...dataAnonyme });
  return await db.collection(`conseillers${suffix}`).deleteOne({ _id: idOriginal });
};

const updateMiseEnRelationConseiller = db => async (id, conseillerObj) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'conseiller.$id': id }, { $set: { conseillerObj } });

const getUserConseiller = db => async id => await db.collection(`users${suffix}`).findOne({ 'entity.$id': id });

const updateUserConseiller = db => async (idMongo, name, token, nom, prenom, password, tokenCreatedAt) =>
  await db.collection(`users${suffix}`).updateOne({ _id: idMongo }, { $set: { name, token, nom, prenom, password, tokenCreatedAt } });

/// id mongodb update
const updateIdMongoConseillerMisesEnRelation = db => async (idOriginal, newIdMongo) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerUser = db => async (idOriginal, newIdMongo) =>
  await db.collection(`users${suffix}`).updateMany({ 'entity.$id': idOriginal }, { $set: { 'entity.$id': newIdMongo } });

const updateIdMongoConseillerCRAS = db => async (idOriginal, newIdMongo) =>
  await db.collection(`cras${suffix}`).updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerStatsTerritoires = db => async (idOriginal, newIdMongo) =>
  await db.collection(`stats_Territoires${suffix}`).updateMany({ 'conseillerIds': { $in: [idOriginal] } }, { $set: { 'conseillerIds.$': newIdMongo } });

const updateIdMongoStatsConseillersCras = db => async (idOriginal, newIdMongo) =>
  await db.collection(`stats_conseillers_cras${suffix}`).updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

const updateIdMongoConseillerRuptures = db => async (idOriginal, newIdMongo) =>
  await db.collection(`conseillersRuptures${suffix}`).updateMany({ 'conseillerId': idOriginal }, { $set: { 'conseillerId': newIdMongo } });

const updateIdMongoSondages = db => async (idOriginal, newIdMongo) =>
  await db.collection(`sondages${suffix}`).updateMany({ 'conseiller.$id': idOriginal }, { $set: { 'conseiller.$id': newIdMongo } });

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
