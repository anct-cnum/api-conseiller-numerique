module.exports = (db, mailer, app) => {

  const templateName = 'candidatPointRecrutement';
  let { utils } = mailer;

  let render = async conseiller => {
    const link = utils.getBackofficeUrl(`/dites-nous-en-plus-sur-vous/${(conseiller.sondageToken)}`);
    return mailer.render(__dirname, templateName, {
      link: link,
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        conseiller.email,
        {
          subject: '[ANNULE ET REMPLACE] Les recrutements ont démarré, dîtes nous en plus sur vous',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
