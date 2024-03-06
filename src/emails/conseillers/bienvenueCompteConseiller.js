module.exports = (db, mailer) => {

  const templateName = 'bienvenueCompteConseiller';
  const { utils } = mailer;

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
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Première connexion à la Coop des Conseillers numériques',
          body: await render(user, conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
