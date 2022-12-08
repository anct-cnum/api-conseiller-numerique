module.exports = (db, mailer) => {

  const { utils } = mailer;
  const templateName = 'conseillerTransfertStructure';

  const render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async emailCN => {
      const onSuccess = () => { };
      const onError = async err => utils.setSentryError(err);
      return mailer.createMailer().sendEmail(
        emailCN,
        {
          subject: 'Demande de transfert',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
