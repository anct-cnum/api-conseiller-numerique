module.exports = (db, mailer, app, logger) => {
  const templateName = 'conseillerChangeEmailCnfs';
  const { utils } = mailer;

  let render = async conseiller => {
    console.log('conseiller:', conseiller);
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getEspaceCoopUrl(`/changement-email-cnfs/${conseiller.token}`),
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      let onSuccess = () => {
        logger.info(`Email pour changer l'email @conseiller-numerique.fr au conseiller avec l'idPG : ${conseiller.idPG}`);
        return db.collection('users').updateOne({ '_id': conseiller._id }, {
          $set: {
            mailSentSupportchangeEmailCnfsDate: new Date(),
            resendSupportchangeEmailCnfs: !!conseiller.mailSentSupportchangeEmailCnfsDate,
          },
          $unset: {
            mailErrorSupportchangeEmailCnfs: '',
            mailErrorSupportchangeEmailCnfsDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': conseiller._id }, {
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
