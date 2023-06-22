module.exports = (db, mailer) => {

  const templateName = 'conseillersRupturePixEchec';
  const { utils } = mailer;

  const render = conseiller => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    templateName,
    render,
    send: async conseiller => {
      const onSuccess = () => { };

      const onError = async err => {
        utils.setSentryError(err);
      };

      return mailer.createMailer().sendEmail(
        utils.getPixContactMail(),
        {
          subject: 'Conseiller en rupture de contrat',
          body: await render(conseiller),
        },
        {},
        utils.getPixSupportMail(),
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
