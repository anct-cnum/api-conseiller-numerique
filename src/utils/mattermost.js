const axios = require('axios');
const slugify = require('slugify');

const createAccount = async ({ mattermost, conseiller, email, login, password, db, logger, Sentry }) => {

  try {
    const resultLogin = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: { 'login_id': mattermost.login, 'password': mattermost.password }
    });

    const token = resultLogin.request.res.headers.token;

    const resultCreation = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: { 'email': email, 'username': login, 'password': password }
    });
    logger.info(resultCreation);

    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { mattermost:
          {
            error: false,
            login: login,
            id: resultCreation.data.id
          }
        }
      });

    slugify.extend({ '-': ' ' });
    slugify.extend({ '\'': ' ' });
    const departements = require('../../data/imports/departements-region.json');
    const departement = departements.find(d => `${d.num_dep}` === conseiller.codeDepartement);
    const channelName = slugify(departement.dep_name, { replacement: '', lower: true });

    const resultChannel = await axios({
      method: 'get',
      url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/channels/name/${channelName}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    logger.info(resultChannel);

    const resultJoinTeam = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/members`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: {
        'user_id': resultCreation.data.id,
        'team_id': mattermost.teamId
      }
    });
    logger.info(resultJoinTeam);

    const resultJoinChannel = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/channels/${resultChannel.data.id}/members`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: {
        'user_id': resultCreation.data.id
      }
    });
    logger.info(resultJoinChannel);

    logger.info(`Compte Mattermost créé ${login} pour le conseiller id=${conseiller._id}`);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e.message);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { mattermost:
          {
            error: true
          }
        }
      });
    return false;
  }
};

const updateAccountPassword = async (mattermost, conseiller, newPassword, db, logger, Sentry) => {

  try {

    //Connexion à l'API de Mattermost
    const resultLogin = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: { 'login_id': mattermost.login, 'password': mattermost.password }
    });

    const token = resultLogin.request.res.headers.token;

    const resultUpdatePassword = await axios({
      method: 'put',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/password`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: { 'new_password': newPassword }
    });
    logger.info(resultUpdatePassword);
    logger.info(`Mot de passe Mattermost mis à jour pour le conseiller id=${conseiller._id}`);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { 'mattermost.errorResetPassword': false }
      });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e.message);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { 'mattermost.errorResetPassword': true }
      });
    return false;
  }

};

const deleteAccount = async (mattermost, conseiller, db, logger, Sentry) => {

  try {

    //Connexion à l'API de Mattermost
    const resultLogin = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: { 'login_id': mattermost.login, 'password': mattermost.password }
    });

    const token = resultLogin.request.res.headers.token;

    //TODO ajouter ?permanent=true quand ServiceSettings.EnableAPIUserDeletion est à true (suppression définitive sinon désactivation)
    const resultDeleteAccount = await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    logger.info(resultDeleteAccount);
    logger.info(`Suppresion compte Mattermost pour le conseiller id=${conseiller._id}`);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { 'mattermost.errorDeleteAccount': false }
      });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e.message);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { 'mattermost.errorDeleteAccount': true }
      });
    return false;
  }

};

module.exports = { createAccount, updateAccountPassword, deleteAccount };
