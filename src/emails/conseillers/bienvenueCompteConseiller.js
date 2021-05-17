module.exports = (db, mailer, app) => {

  const templateName = 'bienvenueCompteConseiller';
  let { utils } = mailer;

  let render = (user, conseiller) => {
    return mailer.render(__dirname, templateName, {
      user,
      conseiller,
      link: utils.getEspaceCoopUrl(`/login`)
    });
  };

  return {
    templateName,
    render,
    send: async (user, conseiller) => {

      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Première connexion à la Coop des Conseillers numériques France Services',
          body: await render(user, conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
