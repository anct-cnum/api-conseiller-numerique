const {
  getTotalConseillers,
  updateConseiller,
  getMiseEnrelationConseiller,
  updateMiseEnRelationConseiller,
  getUserConseiller,
  updateUserConseiller
} = require('./requete-mongo');

const fakeData = require('./fake-data');

const valueExists = (obj, value) => obj.hasOwnProperty(value);

const anonymisationConseiller = async (db, logger) => {
  const cnfs = await getTotalConseillers(db);

  for (let conseiller of cnfs) {
    const id = conseiller._id;
    const data = await fakeData();
    let dataAnonyme = {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone
    };
    // statut : RECRUTE avec le compte COOP activé
    if (valueExists(conseiller, 'emailCNError') && valueExists(conseiller, 'mattermost') && conseiller.statut === 'RECRUTE') {
      const login = `${dataAnonyme.prenom}.${dataAnonyme.nom}`;
      dataAnonyme['mattermost.login'] = login;
      // ici mattermost.id ?!
      dataAnonyme['emailCN.address'] = `${login}@beta-coop-conseiller-numerique.fr`;
    }
    // update seulement nom, prenom, telephone, email
    await updateConseiller(db)(id, dataAnonyme);
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
        'conseillerObj': {
          ...conseillerObj
        }
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
