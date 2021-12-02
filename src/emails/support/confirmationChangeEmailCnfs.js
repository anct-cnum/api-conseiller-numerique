module.exports = (db, mailer, app, logger) => {
  const templateName = 'confirmationChangeEmailCnfs';
  const { utils } = mailer;

  let render = async conseiller => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCoopUrl(`/login`)
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {
      let onSuccess = () => {
        logger.info(`Email pour confirmer  la réussite de la création de l'email @conseiller-numerique.fr au conseiller avec l'idPG : ${conseiller.idPG}`);
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': conseiller._id }, {
          $set: {
            mailErrorConfirmechangeEmailCnfs: 'smtpError',
            mailErrorConfirmechangeEmailCnfsDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.email,
        {
          subject: 'Confirmation du changement de votre e-mail @conseiller-numerique.fr',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
