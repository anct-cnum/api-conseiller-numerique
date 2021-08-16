module.exports = (db, mailer) => {
  const templateName = 'creationCompteCandidat';
  let { utils } = mailer;

  let render = async conseiller => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCandidatUrl(`/inscription/${(conseiller.token)}`),
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
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.name,
        {
          subject: 'Activer votre espace candidat Conseillers numériques France Services',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
