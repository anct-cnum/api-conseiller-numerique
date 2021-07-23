module.exports = (db, mailer, app) => {

  const templateName = 'bienvenueCompteCandidat';
  let { utils } = mailer;

  let render = async candidat => {
    return mailer.render(__dirname, templateName, {
      candidat,
      link: utils.getEspaceCandidatUrl(`/login`),
    });
  };

  return {
    templateName,
    render,
    send: async candidat => {

      let onSuccess = () => {};

      let onError = async err => {
        app.get('sentry').captureException(err);
      };
      return mailer.createMailer().sendEmail(
        candidat.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(candidat),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
