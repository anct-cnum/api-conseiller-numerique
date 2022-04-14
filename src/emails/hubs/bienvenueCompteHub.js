module.exports = (db, mailer) => {
  const templateName = 'bienvenueCompteHub';
  const { utils } = mailer;

  const render = async userHub => {
    return mailer.render(__dirname, templateName, {
      userHub,
      link: utils.getEspaceCoopUrl(`/login`),
    });
  };

  return {
    templateName,
    render,
    send: async userHub => {

      const onSuccess = () => { };

      const onError = async err => {
        utils.setSentryError(err);
        throw err;
      };

      return mailer.createMailer().sendEmail(
        userHub.name,
        {
          subject: 'Bienvenue sur votre espace Admin Coop',
          body: await render(userHub),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
