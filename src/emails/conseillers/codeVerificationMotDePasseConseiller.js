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
    send: async (user, email) => {

      const onSuccess = async () => {
      };

      const onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        email,
        {
          subject: 'Code de vérification des accès Conseiller numérique',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
