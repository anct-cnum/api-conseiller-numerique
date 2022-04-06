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

const anonymisationStructure = async (db, logger) => {
  let query = {};

  const getStructure = await getTotalStructures(db)(query);
  for (let str of getStructure) {
    const idOriginal = str._id;
    const idPG = str.idPG;
    const data = await fakeData({ idPG });
    let newIdMongo = new ObjectId();
    delete str.historique;
    let dataAnonyme = {
      ...str,
      _id: newIdMongo,
      contact: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        fonction: str.fonction ?? 'non renseigné'
      }
    };
    // update seulement nom, prenom, telephone, email
    await updateIdMongoStructure(db)(idOriginal, dataAnonyme); // ok
    await updateIdMongoStructureMisesEnRelation(db)(idOriginal, newIdMongo);//ok
    await updateIdMongoStructureUser(db)(idOriginal, newIdMongo);//ok
    await updateIdMongoStructureConseillerRecrute(db)(idOriginal, newIdMongo); // ok
    await updateIdMongoStructureConseillerRupture(db)(idOriginal, newIdMongo);
  }
  logger.info(`${getStructure.length} structures anonymisers`);
};

const updateMiseEnRelationAndUserStructure = async (db, logger) => {
  let query = {
    'statut': 'VALIDATION_COSELEC',
    'userCreated': true
  };
  const getStructureAnonyme = await getTotalStructures(db)(query);
  for (let structureObjOriginal of getStructureAnonyme) {
    const id = structureObjOriginal._id;
    const { _id, ...structureObj } = structureObjOriginal;
    const updateStructureObj = {
      structureObj
    };
    // update seulement nom, prenom, telephone, email du contact
    await updateMiseEnrelationStructure(db)(id, updateStructureObj); // ok

    // findOne d'un compte user d'une structure
    const resultUser = await getUserStructure(db)(id); // ok
    if (resultUser) {
      const idMongo = resultUser._id;
      const email = structureObj.contact.email;
      const { token, password } = await fakeData({});
      await updateUserStructure(db)(idMongo, email, token, password);
    }
    // ici on gère le multicompte , on change l'zemail + token des multicomptes uniquement
    const idMongoUserIgnore = resultUser._id;
    const multicompte = await getUserMulticompteStructure(db)(id, idMongoUserIgnore); // ok
    for (let m of multicompte) {
      const { email, token, password } = await fakeData({});
      const idMongoUser = m._id;
      await updateUserMulticompteStructure(db)(id, idMongoUser, email, token, password); // ok
    }

  }
  logger.info(`${getStructureAnonyme.length} structures mis à jour dans les mis en relation (VALIDATION_COSELEC)`);
};

module.exports = {
  anonymisationStructure,
  updateMiseEnRelationAndUserStructure
};
