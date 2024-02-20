module.exports = (db, mailer) => {
  const templateName = 'creationCompteConseiller';
  const { utils } = mailer;

  let render = async conseiller => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCoopUrl(`/inscription/${(conseiller.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': conseiller._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!conseiller.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': conseiller._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.name,
        {
          subject: 'Veuillez activer votre compte Coop des Conseillers numériques',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
