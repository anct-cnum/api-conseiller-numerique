const {
  getTotalStructures,
  updateMiseEnrelationStructure,
  updateIdMongoStructure,
  getUserStructure,
  updateUserStructure,
  getUserMulticompteStructure,
  updateUserMulticompteStructure,
  updateIdMongoStructureMisesEnRelation,
  updateIdMongoStructureUser,
  updateIdMongoStructureConseillerRecrute,
  updateIdMongoStructureConseillerRupture
} = require('./requete-mongo');
const fakeData = require('./fake-data');
const { ObjectId } = require('mongodb');

const anonymisationStructure = async (db, logger, limit) => {
  const getStructure = await getTotalStructures(db, limit)({});
  for (const str of getStructure) {
    const idOriginal = str._id;
    const idPG = str.idPG;
    const data = await fakeData({ idPG });
    const newIdMongo = new ObjectId();
    delete str.historique;
    let dataAnonyme = {
      ...str,
      _id: newIdMongo,
      contact: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        fonction: str.fonction ?? 'renseignée'
      },
      faker: true
    };
    // update seulement nom, prenom, telephone, email + idMongo
    await updateIdMongoStructure(db)(idOriginal, dataAnonyme);
    await updateIdMongoStructureMisesEnRelation(db)(idOriginal, newIdMongo);
    await updateIdMongoStructureUser(db)(idOriginal, newIdMongo);
    await updateIdMongoStructureConseillerRecrute(db)(idOriginal, newIdMongo);
    await updateIdMongoStructureConseillerRupture(db)(idOriginal, newIdMongo);
  }
  logger.info(`${getStructure.length} structures anonymisées`);
};

const updateMiseEnRelationAndUserStructure = async (db, logger, limit) => {
  let query = {
    'statut': 'VALIDATION_COSELEC',
    'userCreated': true
  };
  const getStructureAnonyme = await getTotalStructures(db, limit)(query);
  for (const structureObjOriginal of getStructureAnonyme) {
    const id = structureObjOriginal._id;
    const { _id, ...structureObj } = structureObjOriginal;
    const updateStructureObj = {
      structureObj
    };
    // update dans les structureObj
    await updateMiseEnrelationStructure(db)(id, updateStructureObj);

    // findOne d'un compte user d'une structure
    const resultUser = await getUserStructure(db)(id);
    if (resultUser) {
      // _id mongo doc user
      const idMongo = resultUser._id;
      const email = structureObj.contact.email;
      const { token, password, tokenCreatedAt } = await fakeData({});
      await updateUserStructure(db)(idMongo, email, token, password, tokenCreatedAt);
    }
    // ici on gère le multicompte , on change l'email + token des multicomptes uniquement
    const idMongoUserIgnore = resultUser._id;
    const multicompte = await getUserMulticompteStructure(db)(id, idMongoUserIgnore);
    for (const m of multicompte) {
      const { email, token, password, tokenCreatedAt } = await fakeData({});
      const idMongoUser = m._id;
      await updateUserMulticompteStructure(db)(id, idMongoUser, email, token, password, tokenCreatedAt);
    }

  }
  logger.info(`${getStructureAnonyme.length} structures mis à jour dans les mises en relation (VALIDATION_COSELEC)`);
};

module.exports = {
  anonymisationStructure,
  updateMiseEnRelationAndUserStructure
};
