// ...............................................
// Consernant les STRUCTURES
// ...............................................
const suffix = '';

const getValidationStructure = async db => await db.collection(`structures${suffix}`).findOne({ statut: 'VALIDATION_COSELEC' });

const getTotalStructures = (db, limit) => async query =>
  await db.collection(`structures${suffix}`).find({ faker: { '$exists': true }, seed: { '$exists': false }, ...query }).limit(limit).toArray();

const getTotalStructuresAnonyme = (db, limit) => async query =>
  await db.collection(`structures${suffix}`).find({ faker: { '$exists': true }, ...query }).limit(limit).toArray();

const updateIdMongoStructure = db => async (id, dataAnonyme) => {
  await db.collection(`structures${suffix}`).insertOne({ ...dataAnonyme });
  return await db.collection(`structures${suffix}`).deleteOne({ _id: id });
};
const updateMiseEnrelationStructure = db => async (id, structureObj) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'structure.$id': id }, { $set: { ...structureObj } });

const updateMajEffectuer = db => async id =>
  await db.collection(`structures${suffix}`).updateOne({ '_id': id }, { $set: { 'fakerUser': true } });

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

const structurePG = pool => async dataAnonyme => {
  const { prenom, nom, fonction, email, telephone } = dataAnonyme.contact;
  await pool.query(`UPDATE djapp_hostorganization
            SET (contact_first_name,
              contact_last_name,
              contact_job,
              contact_email,
              contact_phone)
                  =
                  ($2,$3,$4,$5,$6)
                WHERE id = $1`,
  [dataAnonyme.idPG, prenom, nom, fonction, email, telephone]);
};

// ...............................................
// Concernant les CONSEILLERS
// ...............................................

const getCnfsRecrute = async db => await db.collection(`conseillers${suffix}`).findOne({ statut: 'RECRUTE' });

const getCnfsNonRecrute = async db => await db.collection(`conseillers${suffix}`).findOne({ statut: { '$ne': 'RECRUTE' } });

const getTotalConseillers = async (db, limit) => await db.collection(`conseillers${suffix}`).find({ faker: { '$exists': false } }).limit(limit).toArray();

const getTotalConseillersAnonyme = async (db, limit) =>
  await db.collection(`conseillers${suffix}`).find({ faker: { '$exists': true }, majUser: { '$exists': false } }).limit(limit).toArray();

const updateIdMongoConseiller = db => async (idOriginal, dataAnonyme) => {
  await db.collection(`conseillers${suffix}`).insertOne({ ...dataAnonyme });
  return await db.collection(`conseillers${suffix}`).deleteOne({ _id: idOriginal });
};

const updateMiseEnRelationConseiller = db => async (id, conseillerObj) =>
  await db.collection(`misesEnRelation${suffix}`).updateMany({ 'conseiller.$id': id }, { $set: { conseillerObj } });

const getUserConseiller = db => async id => await db.collection(`users${suffix}`).findOne({ 'entity.$id': id });

const getUserName = db => async email => await db.collection(`users${suffix}`).findOne({ 'name': email });

const updateMiseEnRelationOK = db => async idMongo =>
  await db.collection(`conseillers${suffix}`).updateOne({ '_id': idMongo }, { $set: { 'majUser': true } });

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

const updateIdMongoPermanenceConseiller = db => async (idOriginal, newIdMongo) =>
  await db.collection(`permanences${suffix}`).updateMany({ 'conseillers': { '$in': [idOriginal] } }, { $set: { 'conseillers.$': newIdMongo } });

const updateIdMongoPermanencesItinerant = db => async (idOriginal, newIdMongo) =>
  await db.collection(`permanences${suffix}`).updateMany({ 'conseillersItinerants': { '$in': [idOriginal] } },
    { $set: { 'conseillersItinerants.$': newIdMongo } });

const conseillerPG = pool => async dataAnonyme => {
  const { idPG, prenom, nom, email, telephone, dateDisponibilite, distanceMax } = dataAnonyme;
  await pool.query(`UPDATE djapp_coach
            SET (
                  first_name,
                  last_name,
                  email,
                  phone,
                  start_date,
                  max_distance)
                  =
                  ($2,$3,$4,$5,$6,$7)
                WHERE id = $1`,
  [idPG, prenom, nom, email, telephone, dateDisponibilite, distanceMax]);
};

// ...............................................
// Concernant des requetes spécifiques
// ...............................................

const deleteUsersSolo = async db =>
  await db.collection(`users${suffix}`).deleteMany({ roles: { $in: ['prefet', 'hub_coop', 'admin', 'coordinateur_coop'] } });

const createUser = db => async body => await db.collection(`users${suffix}`).insertOne(body);
const indexMongoConseillers = async db => await db.collection(`conseillers${suffix}`).aggregate([
  { $indexStats: {} }
]).toArray();


module.exports = {
  // Structures
  getValidationStructure,
  getTotalStructures,
  getTotalStructuresAnonyme,
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
  structurePG,
  // Conseillers
  getCnfsRecrute,
  getCnfsNonRecrute,
  getTotalConseillers,
  getTotalConseillersAnonyme,
  updateIdMongoConseiller,
  updateMiseEnRelationConseiller,
  updateMajEffectuer,
  getUserConseiller,
  getUserName,
  updateMiseEnRelationOK,
  updateUserConseiller,
  updateIdMongoConseillerMisesEnRelation,
  updateIdMongoConseillerUser,
  updateIdMongoConseillerCRAS,
  updateIdMongoConseillerStatsTerritoires,
  updateIdMongoStatsConseillersCras,
  updateIdMongoConseillerRuptures,
  updateIdMongoSondages,
  updateIdMongoPermanenceConseiller,
  updateIdMongoPermanencesItinerant,
  conseillerPG,
  // requetes spécifiques
  deleteUsersSolo,
  createUser,
  indexMongoConseillers
};
