module.exports = (db, mailer, app) => {

  const templateName = 'conseillerRuptureStructure';

  let render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async (miseEnRelation, emailContactStructure) => {
      let onSuccess = () => {
        return db.collection('misesEnRelation').updateOne({ _id: miseEnRelation._id }, {
          $set: {
            mailCnfsRuptureSentDate: new Date(),
            resendMailCnfsRupture: !!miseEnRelation.resendMailCnfsRupture,
          },
          $unset: {
            mailErrorCnfsRupture: '',
            mailErrorDetailCnfsRupture: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('misesEnRelation').updateOne({ _id: miseEnRelation._id }, {
          $set: {
            mailErrorCnfsRupture: 'smtpError',
            mailErrorDetailCnfsRupture: err.message
          }
        });
        app.get('sentry').captureException(err);
      };
      return mailer.createMailer().sendEmail(
        emailContactStructure,
        {
          subject: 'Demande de rupture de contrat avec votre CnFS',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
