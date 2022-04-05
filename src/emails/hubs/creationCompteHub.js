module.exports = (db, mailer) => {
  const templateName = 'creationCompteHub';
  const { utils } = mailer;

  const render = async userHub => {
    return mailer.render(__dirname, templateName, {
      userHub,
      link: utils.getEspaceCoopUrl(`/inscription-hub/${(userHub.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async userHub => {

      const onSuccess = () => {
        return db.collection('users').updateOne({ '_id': userHub._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!userHub.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      const onError = async err => {
        await db.collection('users').updateOne({ '_id': userHub._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        userHub.name,
        {
          subject: 'Activer votre espace administrateur coop numériques France Services',
          body: await render(userHub),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
