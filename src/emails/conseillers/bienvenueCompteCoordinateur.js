module.exports = (db, mailer) => {

  const templateName = 'bienvenueCompteCoordinateur';
  const { utils } = mailer;

  let render = () => {
    return mailer.render(__dirname, templateName, { });
  };

  return {
    templateName,
    render,
    send: async email => {
      let onSuccess = () => {};

      let onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        email,
        {
          subject: 'Bienvenue sur votre espace Admin Coop',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
