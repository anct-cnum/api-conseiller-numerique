module.exports = (db, mailer) => {

  const templateName = 'bienvenueComptePrefet';
  const { utils } = mailer;

  let render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getBackofficeUrl(`/login?role=prefet`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      let onSuccess = () => { };

      let onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
