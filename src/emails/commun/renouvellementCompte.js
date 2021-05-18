module.exports = (db, mailer, app) => {

  const templateName = 'renouvellementCompte';
  let { utils } = mailer;

  let render = async user => {
    const link = user.roles[0] !== 'conseiller' ? utils.getBackofficeUrl(`/login?role=${(user.roles[0])}`) : utils.getEspaceCoopUrl(`/login`);
    return mailer.render(__dirname, templateName, {
      user,
      link: link,
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
          subject: 'Votre mot de passe Conseiller Numérique France services à été renouvelé avec succès',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
