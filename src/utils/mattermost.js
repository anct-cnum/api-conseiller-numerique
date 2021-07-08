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

    await axios({
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

    await axios({
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

    logger.info(`Compte Mattermost créé ${login} pour le conseiller id=${conseiller._id}`);
    return true;
  } catch (e) {
    Sentry.captureException(e.message);
    logger.error(e);
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

module.exports = { createAccount };
