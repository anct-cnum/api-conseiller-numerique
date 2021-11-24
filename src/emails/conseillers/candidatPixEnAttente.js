module.exports = (db, mailer) => {

  const { utils } = mailer;
  const templateName = 'candidatPixEnAttente';

  let render = async candidat => {
    return mailer.render(__dirname, templateName, { candidat });
  };

  return {
    templateName,
    render,
    send: async candidat => {
      let onSuccess = () => { };

      let onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        candidat.email,
        {
          subject: 'Conseiller numérique - Pensez à envoyer vos résultats au test Pix',
          body: await render(candidat),
        }
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
