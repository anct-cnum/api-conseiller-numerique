const axios = require('axios');

const createMailbox = async ({ gandi, conseillerId, login, password, db, logger, Sentry }) => {

  try {
    await axios({
      method: 'post',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Apikey ${gandi.token}`
      },
      data: { 'login': login, 'mailbox_type': 'standard', 'password': password, 'aliases': [] }
    });
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { emailCNError: false,
          emailCN: { address: `${login}@${gandi.domain}` } }
      });
    logger.info(`Boite email créée ${login} pour le conseiller id=${conseillerId}`);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e.message);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { emailCNError: true }
      });
    return false;
  }
};

module.exports = { createMailbox };
