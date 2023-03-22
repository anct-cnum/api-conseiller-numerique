const createEmails = require('../../../../emails/emails');
const createMailer = require('../../../../mailer');
const { ObjectId } = require('mongodb');

const getAdresseIntrouvable = db => async permanenceId => await db.collection('adressesIntrouvables').findOne({ 'permanenceId': new ObjectId(permanenceId) });

const createAdresseIntrouvable = db => async (user, adresseIntrouvable, permanenceId) => await db.collection('adressesIntrouvables').replaceOne(
  { 'permanenceId': permanenceId },
  {
    adresse: adresseIntrouvable,
    conseiller: user.entity,
    permanenceId: permanenceId,
    updatedAt: new Date(),
  },
  { upsert: true }
);


const deleteAdresseIntrouvable = db => async permanenceId => await db.collection('adressesIntrouvables').deleteOne({
  permanenceId: new ObjectId(permanenceId)
});

const sendEmailAdresseIntrouvable = async (app, db, user, adresseIntrouvable, permanenceId) => {
  let mailer = createMailer(app);
  const emails = createEmails(db, mailer);
  let message = emails.getEmailMessageByTemplateName('adresseIntrouvable');
  return await message.send(user, adresseIntrouvable, permanenceId);
};

module.exports = {
  getAdresseIntrouvable,
  createAdresseIntrouvable,
  deleteAdresseIntrouvable,
  sendEmailAdresseIntrouvable
};
