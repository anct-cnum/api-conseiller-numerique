module.exports = (db, mailer) => {

  const templateName = 'invitationStructureEspaceCoop';
  const { utils } = mailer;

  const render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCoopUrl(`/login`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {
      const onSuccess = async () => {
        await db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            mailCoopSend: true
          }
        });
      };

      const onError = async err => {
        await db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message,
            mailCoopSend: false
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Connectez-vous à votre compte Structure sur l\'espace backoffice coop',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
