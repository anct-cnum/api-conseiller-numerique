module.exports = (db, mailer) => {

  const templateName = 'conseillerRuptureStructure';

  let render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async (idMisesEnRelationFinalisee, emailContactStructure) => {
      let onSuccess = () => {
        return db.collection('misesEnRelation').updateOne({ _id: idMisesEnRelationFinalisee._id }, {
          $set: {
            mailCnfsRuptureSentDate: new Date(),
            resendMailCnfsRupture: !!idMisesEnRelationFinalisee.resendMailCnfsRupture,
          },
          $unset: {
            mailErrorCnfsRupture: '',
            mailErrorDetailCnfsRupture: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('misesEnRelation').updateOne({ _id: idMisesEnRelationFinalisee._id }, {
          $set: {
            mailErrorCnfsRupture: 'smtpError',
            mailErrorDetailCnfsRupture: err.message
          }
        });
        throw err;
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

