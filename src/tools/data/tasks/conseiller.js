const {
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
} = require('./requete-mongo');

const fakeData = require('./fake-data');
const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');
const dayOfYear = require('dayjs/plugin/dayOfYear');
dayjs.extend(dayOfYear);

const valueExists = (obj, value) => obj.hasOwnProperty(value);

const anonymisationConseiller = async (db, logger) => {
  const cnfs = await getTotalConseillers(db);

  for (let conseiller of cnfs) {
    const idOriginal = conseiller._id;
    const idPG = conseiller.idPG;
    const data = await fakeData({ idPG });
    let newIdMongo = new ObjectId();
    let dataAnonyme = {
      ...conseiller,
      _id: newIdMongo,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone
    };
    if (conseiller.dateDeNaissance !== undefined) {
      dataAnonyme.dateDeNaissance = dayjs(conseiller.dateDeNaissance).dayOfYear(1).toDate();
    }
    if (valueExists(conseiller, 'cv')) {
      dataAnonyme.cv.file = `${newIdMongo.toString()}.pdf`;
    }
    if (conseiller.statut === 'RECRUTE') {
      if (valueExists(conseiller, 'supHierarchique')) {
        const dataFakeHierarchique = await fakeData({});
        dataAnonyme.supHierarchique = {
          numeroTelephone: dataFakeHierarchique.telephone,
          email: dataFakeHierarchique.email,
          nom: dataFakeHierarchique.nom,
          prenom: dataFakeHierarchique.prenom,
          fonction: conseiller?.supHierarchique?.fonction ?? ''
        };
      }
      const login = `${dataAnonyme.prenom}.${dataAnonyme.nom}`;
      if (conseiller.mattermost.id) {
        dataAnonyme.mattermost.login = login;
        dataAnonyme.mattermost.id = newIdMongo.toString();
      }
      if (conseiller?.emailCN?.address) {
        dataAnonyme.emailCN.address = `${login}@beta-coop-conseiller-numerique.fr`;
      }
    }
    await updateIdMongoConseiller(db)(idOriginal, dataAnonyme);
    await updateIdMongoConseillerMisesEnRelation(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerUser(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerCRAS(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerStatsTerritoires(db)(idOriginal, newIdMongo);
    await updateIdMongoStatsConseillersCras(db)(idOriginal, newIdMongo);
    await updateIdMongoConseillerRuptures(db)(idOriginal, newIdMongo);
    await updateIdMongoSondages(db)(idOriginal, newIdMongo);
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
      const { token, password } = await fakeData({});
      const idMongo = getUserCandidatOrConseiller._id;
      const email = conseillerObj.emailCN?.address ?? conseillerObj.email;
      const nom = conseillerObj.nom.toUpperCase();
      const prenom = conseillerObj.prenom.toUpperCase();
      await updateUserConseiller(db)(idMongo, email, token, nom, prenom, password); // ok
    }
  }
  logger.info(`${cnfs.length} conseillers mis à jour dans les mises en relation & dans les users (recruté et non recruté)`);

};

module.exports = {
  anonymisationConseiller,
  updateMiseEnRelationAndUserConseiller
};
