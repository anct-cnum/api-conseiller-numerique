const {
  getTotalStructures,
  updateMiseEnrelationStructure,
  updateStructure,
  getUserStructure,
  updateUserStructure,
  getUserMulticompteStructure,
  updateUserMulticompteStructure
} = require('./requete-mongo');
const fakeData = require('./fake-data');

const anonymisationStructure = async (db, logger) => {
  let query = {};

  const getStructure = await getTotalStructures(db)(query);
  for (let str of getStructure) {
    const id = str._id;
    const data = await fakeData();
    let dataAnonyme = {
      contact: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        fonction: str.fonction ?? 'non renseigné'
      }
    };
    // update seulement nom, prenom, telephone, email
    await updateStructure(db)(id, dataAnonyme);
  }
  logger.info(`${getStructure.length} structures anonymisers`);
};

const updateMiseEnRelationAndUserStructure = async (db, logger) => {
  let query = {
    'statut': 'VALIDATION_COSELEC'
  };
  const getStructureAnonyme = await getTotalStructures(db)(query);
  for (let structureObj of getStructureAnonyme) {
    const id = structureObj._id;
    const { _id, ...structureObject } = structureObj;
    const updateStructureObj = {
      'structureObj': {
        ...structureObject
      }
    };
    // update seulement nom, prenom, telephone, email du contact
    await updateMiseEnrelationStructure(db)(id, updateStructureObj); // ok
    // ......
    // pour gérer le 1er document en anonyme dans le contact.email dans la collection structure
    // ......
    const resultUser = await getUserStructure(db)(id); // ok
    if (resultUser) {
      const idMongo = resultUser._id;
      const email = structureObject.contact.email;
      const { token } = await fakeData();
      await updateUserStructure(db)(idMongo, email, token);
    }
    // ici on gère le multicompte , on change tout sauf le 1er
    const idMongoUserIgnore = resultUser._id;
    const multicompte = await getUserMulticompteStructure(db)(id, idMongoUserIgnore); // ok
    for (let m of multicompte) {
      const { email, token } = await fakeData();
      const idMongoUser = m._id;
      await updateUserMulticompteStructure(db)(id, idMongoUser, email, token); // ok
    }

  }
  logger.info(`${getStructureAnonyme.length} structures mis à jour dans les mises en raltion (VALIDATION_COSELEC)`);
};

module.exports = {
  anonymisationStructure,
  updateMiseEnRelationAndUserStructure
};
