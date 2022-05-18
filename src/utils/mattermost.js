const axios = require('axios');
const slugify = require('slugify');
const { findDepartement } = require('../utils/geo');

const slugifyName = name => {
  slugify.extend({ '-': ' ' });
  slugify.extend({ '\'': ' ' });
  return slugify(name, { replacement: '', lower: true });
};

const loginAPI = async ({ mattermost }) => {
  const resultLogin = await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/users/login`,
    headers: {
      'Content-Type': 'application/json'
    },
    data: { 'login_id': mattermost.login, 'password': mattermost.password }
  });

  return resultLogin.request.res.headers.token;
};

const getChannel = async (mattermost, token, channelName) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'get',
    url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/channels/name/${channelName}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

const joinChannel = async (mattermost, token, idChannel, idUser) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/channels/${idChannel}/members`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'user_id': idUser
    }
  });
};

const getUsersChannel = async (mattermost, token, idChannel) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'GET',
    url: `${mattermost.endPoint}/api/v4/channels/${idChannel}/members?per_page=200`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

const deleteUserChannel = async (mattermost, token, idChannel, idUser) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'DELETE',
    url: `${mattermost.endPoint}/api/v4/channels/${idChannel}/members/${idUser}`,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

const joinTeam = async (mattermost, token, idTeam, idUser) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/teams/${idTeam}/members`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'user_id': idUser,
      'team_id': idTeam
    }
  });
};

const createAccount = async ({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry }) => {
  try {
    const token = await loginAPI({ mattermost });

    const resultCreation = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: { 'email': email, 'username': login, 'first_name': nom, 'last_name': prenom, 'password': password }
    });
    const infoResult = {
      status: resultCreation?.status,
      url: `${mattermost.endPoint}/api/v4/users`,
      method: 'POST',
      id: resultCreation?.data?.id,
      prenom: resultCreation?.data?.last_name,
      nom: resultCreation?.data?.first_name,
      email: resultCreation?.data?.email
    };
    logger.info(infoResult);

    const mattermostSet = {
      error: false,
      login: login,
      id: resultCreation.data.id
    };
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { mattermost: mattermostSet }
      });

    slugify.extend({ '-': ' ' });
    slugify.extend({ '\'': ' ' });
    const departements = require('../../data/imports/departements-region.json');
    let departement = departements.find(d => `${d.num_dep}` === conseiller.codeDepartement);
    // Cas Saint Martin => on les regroupe au canal département 971 - guadeloupe
    if (conseiller.codeDepartement === '00' && conseiller.codePostal === '97150') {
      departement = departements.find(d => `${d.num_dep}` === '971');
    }

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

    [resultChannel.data.id, mattermost.themeChannelId, mattermost.resourcesChannelId].forEach(async canalId => {
      const resultJoinChannel = await axios({
        method: 'post',
        url: `${mattermost.endPoint}/api/v4/channels/${canalId}/members`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: {
          'user_id': resultCreation.data.id
        }
      });
      logger.info(resultJoinChannel);
    });

    const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
    const regionName = findDepartement(structure.codeDepartement)?.region_name;
    let hub = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionName } } });
    if (hub === null) {
      // Cas Saint Martin => on les regroupe au hub Antilles-Guyane
      if (structure.codeDepartement === '00' && structure.codeCom === '978') {
        hub = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: '973' } } });
      } else {
        hub = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${structure.codeDepartement}` } } });
      }
    }
    if (hub !== null) {
      await joinTeam(mattermost, token, mattermost.hubTeamId, mattermostSet.id);
      await joinChannel(mattermost, token, hub.channelId, mattermostSet.id);
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, {
        $set: { 'mattermost.hubJoined': true }
      });
      await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, {
        $set: { 'conseillerObj.mattermost.hubJoined': true }
      });
    }

    logger.info(`Compte Mattermost créé ${login} pour le conseiller id=${conseiller._id} avec un id mattermost: ${mattermostSet.id}`);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { 'mattermost.error': true, 'mattermost.errorMessage': e.message }
      });
    return false;
  }
};

const updateAccountPassword = (mattermost, db, logger, Sentry) => async (conseiller, newPassword) => {

  try {
    const token = await loginAPI({ mattermost });

    const resultUpdatePassword = await axios({
      method: 'put',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/password`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: { 'new_password': newPassword }
    });
    const resultInfo = {
      status: resultUpdatePassword?.status,
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/password`,
      method: 'PUT',
      id: conseiller.mattermost?.id
    };
    logger.info(resultInfo);
    logger.info(`Mot de passe Mattermost mis à jour pour le conseiller id=${conseiller._id} avec un id mattermost: ${conseiller.mattermost.id})`);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { 'mattermost.errorResetPassword': false }
      });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { 'mattermost.errorResetPassword': true }
      });
    return false;
  }

};

const deleteAccount = async (mattermost, conseiller, db, logger, Sentry) => {

  try {
    const token = await loginAPI({ mattermost });

    //Query parameter permanent pour la suppression définitive (il faut que le paramètre ServiceSettings.EnableAPIUserDeletion soit configuré à true)
    const resultDeleteAccount = await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}?permanent=true`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    logger.info(resultDeleteAccount);
    logger.info(`Suppresion compte Mattermost pour le conseiller id=${conseiller._id} avec un id mattermost: ${conseiller.mattermost.id}`);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { 'mattermost.errorDeleteAccount': false }
      });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      {
        $set:
          { 'mattermost.errorDeleteAccount': true }
      });
    return false;
  }

};

const createChannel = async (mattermost, token, teamId, name) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  return await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/channels`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'team_id': teamId,
      'name': slugifyName(name),
      'display_name': name,
      'type': 'P'
    }
  });
};

const deleteArchivedChannels = async (mattermost, token) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  const channels = await axios({
    method: 'get',
    url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/channels/deleted`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const promises = [];

  for (const channel of channels.data) {
    promises.push(await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/channels/${channel.id}?permanent=true`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }));
  }

  return Promise.all(promises);
};


// eslint-disable-next-line max-len
const patchLogin = ({ Sentry, logger, db, mattermost, patchLoginMattermostMongo, patchLoginMattermostMongoError }) => async ({ conseiller, userIdentity }) => {

  const token = await loginAPI({ mattermost });

  try {
    const { login, nom, prenom, email } = userIdentity;
    const resultUpdateLogin = await axios({
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
    logger.info(resultUpdateLogin);
    logger.info(`Login Mattermost mis à jour pour le conseiller id=${conseiller._id} avec un id mattermost: ${conseiller.mattermost.id}`);
    await patchLoginMattermostMongo(db)(conseiller, login);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await patchLoginMattermostMongoError(db)(conseiller);
    return false;
  }
};

const searchUser = async (mattermost, token, conseiller) => {
  if (token === undefined || token === null) {
    token = await loginAPI({ mattermost });
  }

  const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
  const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
  const login = `${prenom}.${nom}`;

  return await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/users/usernames`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: [login]
  });
};

const updateLogin = (mattermost, gandi, logger) => async (conseiller, login) => {
  const token = await loginAPI({ mattermost });
  const resultUpdateJustLogin = await axios({
    method: 'put',
    url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/patch`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'username': login,
      'email': `${login}@${gandi.domain}`
    }
  });
  logger.info(resultUpdateJustLogin);
};

module.exports = {
  slugifyName,
  loginAPI,
  getChannel,
  createAccount,
  updateAccountPassword,
  deleteAccount,
  createChannel,
  joinChannel,
  getUsersChannel,
  deleteUserChannel,
  joinTeam,
  deleteArchivedChannels,
  searchUser,
  patchLogin,
  updateLogin
};
