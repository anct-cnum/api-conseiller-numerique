module.exports = (db, mailer) => {
  const templateName = 'adresseIntrouvable';
  const { utils } = mailer;

  const render = async (user, adresseIntrouvable, permanenceId) => {
    return mailer.render(__dirname, templateName, {
      user,
      adresseIntrouvable,
      permanenceId
    });
  };

  return {
    templateName,
    render,
    send: async (user, adresseIntrouvable, permanenceId) => {
      const onSuccess = async () => {
        return true;
      };
      const onError = async err => {
        await db.collection('adressesIntrouvables').updateOne({ 'permanenceId': permanenceId }, {
          $set: {
            mailErrorAdresseIntrouvable: 'smtpError',
            mailErrorDetailAdresseIntrouvable: err.message
          }
        });
        utils.setSentryError(err);
        return false;
      };

      return mailer.createMailer().sendEmail(
        utils.getSupportMail(),
        {
          subject: 'Un Conseiller Numérique France service n\'a pas trouvé son adresse',
          body: await render(user, adresseIntrouvable),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
