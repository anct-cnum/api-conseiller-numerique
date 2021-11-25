module.exports = (db, mailer) => {

  const templateName = 'invitationAdminEspaceCoop';
  const { utils } = mailer;

  let render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCoopUrl(`/inscription/${(user.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {
      let onSuccess = () => {
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
          subject: 'Connectez-vous à votre compte Administrateur de l&rsquo;espace coop',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
