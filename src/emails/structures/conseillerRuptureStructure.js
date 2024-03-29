module.exports = (db, mailer) => {

  const { utils } = mailer;
  const templateName = 'conseillerRuptureStructure';

  const render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async (miseEnRelation, emailContactStructure) => {
      const onSuccess = () => {
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

      const onError = async err => {
        await db.collection('misesEnRelation').updateOne({ _id: miseEnRelation._id }, {
          $set: {
            mailErrorCnfsRupture: 'smtpError',
            mailErrorDetailCnfsRupture: err.message
          }
        });
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        emailContactStructure,
        {
          subject: 'Demande de rupture de contrat avec votre Conum',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
