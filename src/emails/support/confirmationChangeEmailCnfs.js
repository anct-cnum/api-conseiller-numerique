module.exports = (db, mailer, app, logger) => {
  const templateName = 'confirmationChangeEmailCnfs';
  const { utils } = mailer;

  const render = async conseiller => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCoopUrl(`/login`)
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {
      const onSuccess = async () => {
        logger.info(`Email pour confirmer la réussite de la création de l'email @conseiller-numerique.fr au conseiller avec l'idPG : ${conseiller.idPG}`);
        return db.collection('users').updateOne({ 'entity.$id': conseiller._id }, {
          $set: {
            mailSendConfirmechangeEmailCnfsDate: new Date(),
            resendConfirmechangeEmailCnfs: !!conseiller.mailSentConfirmechangeEmailCnfsDate,
          },
          $unset: {
            mailErrorConfirmechangeEmailCnfs: '',
            mailErrorConfirmechangeEmailCnfsDetail: ''
          },
        });
      };

      const onError = async err => {
        await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, {
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
