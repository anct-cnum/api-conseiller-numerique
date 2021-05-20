module.exports = (db, mailer, app) => {

  const templateName = 'candidatPixEnAttente';

  let render = async candidat => {
    console.log(candidat.email);
    return mailer.render(__dirname, templateName, { candidat });
  };

  return {
    templateName,
    render,
    send: async candidat => {
      console.log(candidat.email);
      let onSuccess = () => {
        console.log('success');
      };

      let onError = async err => {
        console.log('error');
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
