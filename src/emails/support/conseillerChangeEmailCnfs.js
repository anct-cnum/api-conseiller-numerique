module.exports = (db, mailer, app, logger) => {
  const templateName = 'conseillerChangeEmailCnfs';
  const { utils } = mailer;

  const render = async conseiller => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCoopUrl(`/changer-email/${conseiller.token}`),
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      const onSuccess = () => {
        logger.info(`Email pour changer l'email @conseiller-numerique.fr au conseiller avec l'idPG : ${conseiller.idPG}`);
        return db.collection('users').updateOne({ 'entity.$id': conseiller._id }, {
          $set: {
            mailSendSupportchangeEmailCnfsDate: new Date(),
            resendSupportchangeEmailCnfs: !!conseiller.mailSentSupportchangeEmailCnfsDate,
          },
          $unset: {
            mailErrorSupportchangeEmailCnfs: '',
            mailErrorSupportchangeEmailCnfsDetail: ''
          },
        });
      };

      const onError = async err => {
        await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, {
          $set: {
            mailErrorSupportchangeEmailCnfs: 'smtpError',
            mailErrorSupportchangeEmailCnfsDetail: err.message
          }
        });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.email,
        {
          subject: 'Changement de votre e-mail @conseiller-numerique.fr',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
