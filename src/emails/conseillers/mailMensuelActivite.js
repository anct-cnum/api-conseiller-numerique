module.exports = mailer => {
  const templateName = 'mailMensuelActivite';
  const templateNameNull = 'mailMensuelActiviteNull';
  const { utils } = mailer;

  const render = async (conseiller, cras) => {
    return mailer.render(__dirname, cras.nbAccompagnements > 0 ? templateName : templateNameNull, { conseiller, cras });
  };

  return {
    templateName,
    render,
    send: async (conseiller, cras) => {

      const onSuccess = () => {
        return;
      };

      const onError = async err => {
        utils.setSentryError(err);
        throw err;
      };

      return mailer.createMailer().sendEmail(
        conseiller.emailCN.address,
        {
          subject: '',
          body: await render(conseiller, cras),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
