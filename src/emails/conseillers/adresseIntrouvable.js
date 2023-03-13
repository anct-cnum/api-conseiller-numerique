module.exports = (db, mailer) => {
  const templateName = 'adresseIntrouvable';
  const { utils } = mailer;

  const render = async (user, permanence) => {
    return mailer.render(__dirname, templateName, {
      user,
      permanence,
    });
  };

  return {
    templateName,
    render,
    send: async (user, permanence) => {
      const onSuccess = async () => {
        return true;
      };
      const onError = async err => {
        await db.collection('permanences').updateOne({ '_id': permanence._id }, {
          $set: {
            mailErrorAdresseIntrouvable: 'smtpError'
          }
        });
        utils.setSentryError(err);
        return false;
      };
      return mailer.createMailer().sendEmail(
        utils.getSupportMail(),
        {
          subject: 'Un Conseiller Numérique France service n\'a pas trouvé son adresse',
          body: await render(user, permanence),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
