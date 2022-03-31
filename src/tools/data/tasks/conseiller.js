const {
  getTotalConseillers,
  updateConseiller,
  getMiseEnrelationConseiller,
  updateMiseEnRelationConseiller,
  getUserConseiller,
  updateUserConseiller,
  updateIdMongoConseillerMisesEnRelation,
  updateIdMongoConseillerUser,
  updateIdMongoConseillerCRAS
} = require('./requete-mongo');

const fakeData = require('./fake-data');
const { ObjectId } = require('mongodb');

const valueExists = (obj, value) => obj.hasOwnProperty(value);

const anonymisationConseiller = async (db, logger) => {
  const cnfs = await getTotalConseillers(db);

  for (let conseiller of cnfs) {
    const idOriginal = conseiller._id;
    const idPG = conseiller.idPG;
    const data = await fakeData({ idPG });
    let newIdMongo = new ObjectId();
    let dataAnonyme = {
      _id: newIdMongo,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone
    };

    if (valueExists(conseiller, 'cv')) {
      dataAnonyme['cv.file'] = `${newIdMongo.toString()}.pdf`;
    }
    // statut : RECRUTE
    if (conseiller.statut === 'RECRUTE') {
      if (valueExists(conseiller, 'supHierarchique')) {
        const dataFakeHierarchique = await fakeData();
        dataAnonyme['supHierarchique'] = {
          numeroTelephone: dataFakeHierarchique.telephone,
          email: dataFakeHierarchique.email,
          nom: dataFakeHierarchique.nom,
          prenom: dataFakeHierarchique.prenom,
          fonction: conseiller?.supHierarchique?.fonction ?? ''
        };
      }
      if (valueExists(conseiller, 'emailCNError') && conseiller?.mattermost?.error === false) {
        const login = `${dataAnonyme.prenom}.${dataAnonyme.nom}`;
        dataAnonyme['mattermost.login'] = login;
        dataAnonyme['mattermost.id'] = newIdMongo.toString();
        dataAnonyme['emailCN.address'] = `${login}@beta-coop-conseiller-numerique.fr`;
      }
    }
    console.log('dataAnonyme:', dataAnonyme);
    // update seulement nom, prenom, telephone, email
    await updateConseiller(db)(idOriginal, dataAnonyme);
    await updateIdMongoConseillerMisesEnRelation(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerUser(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerCRAS(db)(idOriginal, newIdMongo);
  }
  logger.info(`${cnfs.length} conseillers anonymisers`);
};


const updateMiseEnRelationAndUserConseiller = async (db, logger) => {
  const cnfs = await getTotalConseillers(db);
  for (let conseillerObj of cnfs) {
    const id = conseillerObj._id;
    const countMiseEnRelation = await getMiseEnrelationConseiller(db)(id); // ok
    if (countMiseEnRelation >= 1) {
      const updateConseillerObj = {
        conseillerObj
      };
      await updateMiseEnRelationConseiller(db)(id, updateConseillerObj); //ok
    }
    // mettre à jour son compte user
    const getUserCandidatOrConseiller = await getUserConseiller(db)(id); //ok
    if (getUserCandidatOrConseiller) {
      const { token } = await fakeData();
      const idMongo = getUserCandidatOrConseiller._id;
      let email = conseillerObj?.emailCN?.address ?? conseillerObj.email;
      const nom = conseillerObj.nom.toUpperCase();
      const prenom = conseillerObj.prenom.toUpperCase();
      await updateUserConseiller(db)(idMongo, email, token, nom, prenom); // ok
    }
  }
  logger.info(`${cnfs.length} conseillers mis à jour dans les mises en relation & dans les users (recruté et non recruté)`);

};

module.exports = {
  anonymisationConseiller,
  updateMiseEnRelationAndUserConseiller
};
