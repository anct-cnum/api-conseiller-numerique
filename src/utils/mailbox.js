const axios = require('axios');

const createMailbox = async ({ gandi, conseillerId, login, password, db, logger, Sentry }) => {

  try {
    const resultCreation = await axios({
      method: 'post',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Apikey ${gandi.token}`
      },
      data: { 'login': login, 'mailbox_type': 'standard', 'password': password, 'aliases': [] }
    });
    logger.info(resultCreation);

    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { emailCNError: false,
          emailCN: { address: `${login}@${gandi.domain}` } }
      });
    logger.info(`Boite email créée ${login} pour le conseiller id=${conseillerId}`);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { emailCNError: true }
      });
    return false;
  }
};
const updateMailboxLogin = async (gandi, conseillerId, nouveauEmail, login, password, db, logger, Sentry) => {

  try {
    const mailbox = await axios({
      method: 'get',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
      headers: {
        'Authorization': `Apikey ${gandi.token}`
      }
    });

    console.log('mailbox.data[0]:', mailbox.data);
    console.log('gandi.domain:', gandi.domain);
    if (mailbox?.data.length !== 1) {
      // const resultUpdateEmailPro = await axios({
      //   method: 'patch',
      //   url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Apikey ${gandi.token}`
      //   },
      //   data: { 'login': nouveauEmail }
      // });
      // logger.info(resultUpdateEmailPro);
      logger.info(`Nouveau Email professionnel mis à jour : ${login} pour le conseiller id=${conseillerId}`);
      // await db.collection('conseillers').updateOne({ _id: conseillerId },
      //   { $set:
      //     { emailCNError: false,
      //       emailCN: { address: `${nouveauEmail}` } }
      //   });
      return true;
    } else {
      logger.error(`Login ${login} inexistant dans Gandi`);
      // await db.collection('conseillers').updateOne({ _id: conseillerId },
      //   { $set:
      //     { resetLoginCNError: true }
      //   });
      return false;
    }
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e.message);
    // await db.collection('conseillers').updateOne({ _id: conseillerId },
    //   { $set:
    //     { resetLoginCNError: true }
    //   });
    return false;
  }
};

const updateMailboxPassword = async (gandi, conseillerId, login, password, db, logger, Sentry) => {

  try {
    //Récuperation de l'id mailbox associé au login pour patcher
    const mailbox = await axios({
      method: 'get',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
      headers: {
        'Authorization': `Apikey ${gandi.token}`
      }
    });

    //Si trouvé : mise à jour du password
    if (mailbox?.data.length === 1) {
      const resultUpdatePassword = await axios({
        method: 'patch',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        },
        data: { 'password': password }
      });
      logger.info(resultUpdatePassword);
      logger.info(`Mot de passe Webmail Gandi mis à jour du login ${login} pour le conseiller id=${conseillerId}`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        { $set:
          { resetPasswordCNError: false }
        });
      return true;
    } else {
      logger.error(`Login ${login} inexistant dans Gandi`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        { $set:
          { resetPasswordCNError: true }
        });
      return false;
    }
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { resetPasswordCNError: true }
      });
    return false;
  }
};

const deleteMailbox = async (gandi, conseillerId, login, db, logger, Sentry) => {

  try {
    //Récuperation de l'id mailbox associé au login pour 'delete'
    const mailbox = await axios({
      method: 'get',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
      headers: {
        'Authorization': `Apikey ${gandi.token}`
      }
    });

    //Si trouvé : suppression de la boite mail
    if (mailbox?.data.length === 1) {
      const resultDeleteMailbox = await axios({
        method: 'delete',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        }
      });
      logger.info(resultDeleteMailbox);
      logger.info(`Suppresion boite mail Gandi du login ${login} pour le conseiller id=${conseillerId}`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        { $set:
          { 'emailCN.deleteMailboxCNError': false }
        });
      return true;
    } else {
      logger.error(`Login ${login} inexistant dans Gandi`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        { $set:
          { 'emailCN.deleteMailboxCNError': true }
        });
      return false;
    }
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      { $set:
        { 'emailCN.deleteMailboxCNError': true }
      });
    return false;
  }

};

module.exports = { createMailbox, updateMailboxLogin, updateMailboxPassword, deleteMailbox };
