const axios = require('axios');

const createMailbox = ({ gandi, db, logger, Sentry }) => async ({ conseillerId, login, password }) => {
  try {
    const resultCreation = await axios({
      method: 'post',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Apikey ${gandi.token}`
      },
      data: { 'login': login, 'mailbox_type': gandi.type, 'password': password, 'aliases': [] }
    });
    const resultInfo = {
      status: resultCreation?.status,
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
      method: 'POST',
      login: login,
      message: resultCreation?.data?.message
    };
    logger.info(resultInfo);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      {
        $set:
        {
          emailCNError: false,
          emailCN: { address: `${login}@${gandi.domain}` }
        }
      });
    logger.info(`Boite email créée ${login} pour le conseiller id=${conseillerId}`);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      {
        $set:
          { emailCNError: true }
      });
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
      const resultInfo = {
        status: resultUpdatePassword?.status,
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
        method: 'PATCH',
        login: login,
        message: resultUpdatePassword?.data?.message
      };
      logger.info(resultInfo);
      logger.info(`Mot de passe Webmail Gandi mis à jour du login ${login} pour le conseiller id=${conseillerId}`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        {
          $set:
            { resetPasswordCNError: false }
        });
      return true;
    } else {
      logger.error(`Login ${login} inexistant dans Gandi`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        {
          $set:
            { resetPasswordCNError: true }
        });
      return false;
    }
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      {
        $set:
          { resetPasswordCNError: true }
      });
    return false;
  }
};

const deleteMailbox = (gandi, db, logger, Sentry) => async (conseillerId, login) => {

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
        {
          $set:
            { 'emailCN.deleteMailboxCNError': false }
        });
      return true;
    } else {
      logger.error(`Login ${login} inexistant dans Gandi`);
      await db.collection('conseillers').updateOne({ _id: conseillerId },
        {
          $set:
            { 'emailCN.deleteMailboxCNError': true }
        });
      return false;
    }
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    await db.collection('conseillers').updateOne({ _id: conseillerId },
      {
        $set:
          { 'emailCN.deleteMailboxCNError': true }
      });
    return false;
  }

};
const getMailBox = async ({ gandi, login }) => {
  return axios({
    method: 'get',
    url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
    headers: {
      'Authorization': `Apikey ${gandi.token}`
    }
  });
};

const fixHomonymesCreateMailbox = async (gandi, nom, prenom, db) => {
  let login = `${prenom}.${nom}`;
  let conseillerNumber = await db.collection('conseillers').countDocuments(
    {
      'emailCN.address': `${login}@${gandi.domain}`,
      'statut': 'RECRUTE'
    });
  if (conseillerNumber > 0) {
    let indexLoginConseiller = 1;
    do {
      login = `${prenom}.${nom}${indexLoginConseiller}`;
      conseillerNumber = await db.collection('conseillers').countDocuments(
        {
          'emailCN.address': `${login}@${gandi.domain}`,
          'statut': 'RECRUTE'
        });
      indexLoginConseiller += 1;
    } while (conseillerNumber !== 0);
  }

  return login;
};

const verifHomonymesMailbox = async (nom, prenom, conseillerId, db) => {
  let login = `${prenom}.${nom}`;
  let conseillersHomonyme = await db.collection('conseillers').distinct('emailCN.address',
    {
      '_id': { $ne: conseillerId },
      'emailCN.address': { $regex: new RegExp(login) },
      'statut': 'RECRUTE'
    });

  return conseillersHomonyme.length >= 1 ? conseillersHomonyme[0] : login;
};

module.exports = { createMailbox, updateMailboxPassword, deleteMailbox, getMailBox, fixHomonymesCreateMailbox, verifHomonymesMailbox };

