const { v4: uuidv4 } = require('uuid');

const misesAJourMongo = (db, app) => async (conseillerId, email, userIdentity, password) => {
  const { mattermost, emailCN } = await db.collection('conseillers').findOne({ _id: conseillerId });
  await db.collection('conseillers').updateOne({ _id: conseillerId }, { $set: { nom: userIdentity.nom, prenom: userIdentity.prenom } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseillerId },
    {
      $set: {
        'conseillerObj.mattermost': mattermost,
        'conseillerObj.emailCN': emailCN,
        'conseillerObj.nom': userIdentity.nom,
        'conseillerObj.prenom': userIdentity.prenom
      }
    });
  const idUser = await db.collection('users').findOne({ 'entity.$id': conseillerId });
  const newDateAction = new Date();
  app.service('users').patch(idUser._id, {
    password: password, name: email, nom: userIdentity.nom, prenom: userIdentity.prenom,
    token: uuidv4(), tokenCreatedAt: newDateAction, passwordCreatedAt: newDateAction
  });
};

const misesAJourPg = pool => async (idPG, nom, prenom) => {
  await pool.query(`UPDATE djapp_coach
        SET (first_name, last_name) = ($2, $3) WHERE id = $1`,
  [idPG, prenom, nom]);
};

const historisationMongo = db => async (conseillerId, conseiller, user) => {
  await db.collection('users').updateOne({ 'entity.$id': conseillerId }, { $unset: { support_cnfs: {} } });
  await db.collection('conseillers').updateOne({ _id: conseillerId }, {
    $push: {
      historique: {
        data: {
          ancienEmail: conseiller.emailCN.address,
          nouveauEmail: user.support_cnfs.nouveauEmail
        },
        date: new Date()
      }
    }
  });
};

const getConseiller = db => async conseillerId => await db.collection('conseillers').findOne({ _id: conseillerId });

const patchLoginMattermostMongo = db => async (conseiller, login) => {
  return await db.collection('conseillers').updateOne({ _id: conseiller._id },
    {
      $set:
      {
        'mattermost.errorPatchLogin': false,
        'mattermost.login': login
      }
    });
};
const patchLoginMattermostMongoError = db => async conseiller => {
  return db.collection('conseillers').updateOne({ _id: conseiller._id },
    {
      $set:
        { 'mattermost.errorPatchLogin': true }
    });
};

const patchApiMattermostLogin = (mattermost, axios) => async (conseiller, login, nom, prenom, email, token) => {
  return await axios({
    method: 'put',
    url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/patch`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'username': login,
      'first_name': nom,
      'last_name': prenom,
      'email': email
    }
  });
};

module.exports = {
  misesAJourMongo,
  misesAJourPg,
  historisationMongo,
  getConseiller,
  patchLoginMattermostMongo,
  patchLoginMattermostMongoError,
  patchApiMattermostLogin
};
