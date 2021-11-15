module.exports = (db, mailer, app, logger) => {

  const templateName = 'candidatSupprimePix';
  let { utils } = mailer;

  let render = candidat => {
    return mailer.render(__dirname, templateName, { candidat });
  };
  let options = {};
  return {
    templateName,
    render,
    send: async candidat => {
      let onSuccess = () => {
        logger.info(`Mail envoyer à PIX avec succès pour le candidat ${candidat}`);
      };

      let onError = async err => {
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
