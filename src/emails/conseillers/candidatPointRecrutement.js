module.exports = (db, mailer, app) => {

  const templateName = 'candidatPointRecrutement';
  let { utils } = mailer;

  let render = async user => {
    const link = utils.getBackofficeUrl(`/dites-nous-en-plus-sur-vous/${(user.tokenRetourRecrutement)}`);
    return mailer.render(__dirname, templateName, {
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
        user.email,
        {
          subject: 'Les recrutements ont démarré, dîtes nous en plus sur vous',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
