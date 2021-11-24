module.exports = (db, mailer) => {

  const templateName = 'candidatPointRecrutement';
  const { utils } = mailer;

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
        utils.setSentryError(err);
      };

      return mailer.createMailer().sendEmail(
        conseiller.email,
        {
          subject: 'Les recrutements ont démarré, dites-nous en plus sur vous',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
