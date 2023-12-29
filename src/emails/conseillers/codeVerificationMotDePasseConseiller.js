module.exports = mailer => {

  const templateName = 'codeVerificationMotDePasseConseiller';
  const { utils } = mailer;

  const render = user => {
    return mailer.render(__dirname, templateName, {
      code: user.numberLoginUnblock
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      const onSuccess = async () => {
      };

      const onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Vérification de vos accès',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
