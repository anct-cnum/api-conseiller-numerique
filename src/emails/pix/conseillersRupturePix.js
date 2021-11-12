module.exports = (db, mailer, app) => {

  const templateName = 'conseillersRupturePix';
  let { utils } = mailer;

  let render = conseillers => {

    //TODO voir pour un csv en attachement plutot...
    return mailer.render(__dirname, templateName, { conseillers });
  };

  return {
    templateName,
    render,
    send: async conseillers => {
      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        utils.getPixContactMail(),
        {
          subject: 'Conseillers en rupture de contrat',
          body: await render(conseillers)
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
