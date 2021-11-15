module.exports = (db, mailer, app, logger) => {

  const templateName = 'candidatSupprimePix';
  const { utils } = mailer;

  const render = candidat => {
    return mailer.render(__dirname, templateName, { candidat });
  };
  let options = {};
  return {
    templateName,
    render,
    send: async candidat => {
      const onSuccess = () => {
        logger.info(`Email envoyé à PIX avec succès pour le candidat ${candidat}`);
      };

      const onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        utils.getPixContactMail(),
        {
          subject: 'Demande de Suppression d\'un candidat',
          body: await render(candidat)
        },
        options,
        utils.getPixSupportMail()
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
