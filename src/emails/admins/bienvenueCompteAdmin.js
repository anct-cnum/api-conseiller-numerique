module.exports = (db, mailer, app) => {

  const templateName = 'bienvenueCompteAdmin';
  let { utils } = mailer;

  let render = async admin => {
    return mailer.render(__dirname, templateName, {
      admin,
      link: utils.getBackofficeUrl(`/login?role=admin`),
    });
  };

  return {
    templateName,
    render,
    send: async admin => {

      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        admin.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(admin),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
