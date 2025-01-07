const { v4: uuidv4 } = require('uuid');
const { patchLogin } = require('../../utils/mattermost');

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

const patchApiMattermostLogin = ({ Sentry, logger, db, mattermost }) => ({ conseiller, userIdentity }) => {
  return patchLogin({ Sentry, logger, db, mattermost, patchLoginMattermostMongo, patchLoginMattermostMongoError })({ conseiller, userIdentity });
};

const validationEmailPrefet = Joi => async email => {
  const schema = await Joi.object({
    email: Joi.string().trim().required().email().error(new Error('Le format de l\'email est invalide')),
  }).validate({ email });
  return schema;
};
const validationCodeRegion = Joi => niveau => {
  const schema = Joi.object({
    regionCode: Joi.string().max(3).error(new Error('Le code région est invalide'))
  }).validate(niveau);
  return schema;
};

const validationCodeDepartement = Joi => niveau => {
  const schema = Joi.object({
    departement: Joi.string().max(3).error(new Error('Le code département est invalide'))
  }).validate(niveau);
  return schema;
};

module.exports = {
  misesAJourMongo,
  historisationMongo,
  getConseiller,
  patchLoginMattermostMongo,
  patchLoginMattermostMongoError,
  patchApiMattermostLogin,
  validationEmailPrefet,
  validationCodeRegion,
  validationCodeDepartement
};
