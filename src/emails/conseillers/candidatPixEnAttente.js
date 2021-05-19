module.exports = (db, mailer, app) => {

  const templateName = 'candidatPixEnAttente';

  let render = async candidat => {
    return mailer.render(__dirname, templateName, {});
  };

  return {
    templateName,
    render,
    send: async candidat => {

      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        candidat.email,
        {
          subject: 'Conseiller numérique - Pensez à envoyer vos résultats au test Pix',
          body: await render(candidat),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
