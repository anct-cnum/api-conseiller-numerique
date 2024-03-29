module.exports = (db, mailer) => {

  const templateName = 'bienvenueCompteAdmin';
  const { utils } = mailer;

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
        utils.setSentryError(err);
      };

      return mailer.createMailer().sendEmail(
        admin.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique',
          body: await render(admin),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
