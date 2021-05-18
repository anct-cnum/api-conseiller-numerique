module.exports = (db, mailer, app) => {

  const templateName = 'motDePasseOublie';
  let { utils } = mailer;

  let render = async user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getBackofficeUrl(`/renouveler-mot-de-passe/${(user.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        user.persoEmail ?? user.name,
        {
          subject: 'Renouvellement de votre mot de passe Conseiller Numérique France services',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
