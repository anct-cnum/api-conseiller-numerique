const axios = require('axios');

const createAccount = async ({ mattermost, conseiller, login, password, db, logger, Sentry }) => {

  try {
    const result = await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: { 'login_id': mattermost.login, 'password': mattermost.password }
    });

    const token = result.request.res.headers.token;

    await axios({
      method: 'post',
      url: `${mattermost.endPoint}/api/v4/users`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: { 'email': conseiller.emailCN.address, 'username': login, 'password': password }
    });

    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { mattermostError: false,
          mattermostLogin: login
        }
      });
    logger.info(`Compte Mattermost créé ${login} pour le conseiller id=${conseiller._id}`);
    return true;
  } catch (e) {
    Sentry.captureException(e.message);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseiller._id },
      { $set:
        { mattermostError: true }
      });
    return false;
  }
};

module.exports = { createAccount };
