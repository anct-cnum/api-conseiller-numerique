module.exports = (db, mailer) => {

  const templateName = 'invitationAdminEspaceCoopBDT';
  let { utils } = mailer;

  let render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCoopUrl(`/login?role=admin`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {
      let onSuccess = () => { };

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
          subject: 'Connectez-vous à votre compte administrateur de l\'Espace Coop',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
