module.exports = (db, mailer) => {

  const templateName = 'creationComptePrefet';
  let { utils } = mailer;

  let render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getBackofficeUrl(`/inscription/${(user.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!user.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Créer votre compte utilisateur Conseiller Numérique France services',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
