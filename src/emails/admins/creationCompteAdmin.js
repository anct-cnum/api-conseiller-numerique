module.exports = (db, mailer) => {

  const templateName = 'creationCompteAdmin';
  const { utils } = mailer;

  let render = async admin => {
    return mailer.render(__dirname, templateName, {
      admin,
      link: utils.getBackofficeUrl(`/inscription/${(admin.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async admin => {

      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': admin._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!admin.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': admin._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        admin.name,
        {
          subject: 'Créez votre compte administrateur Conseiller Numérique France services',
          body: await render(admin),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
