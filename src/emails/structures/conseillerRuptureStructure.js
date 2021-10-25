module.exports = (db, mailer) => {

  const templateName = 'conseillerRuptureStructure';

  let render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async (conseillerFinalisee, emailContactStructure) => {
      const structure = await db.collection('structures').findOne({ '_id': conseillerFinalisee.structureObj._id });
      const conseiller = await db.collection('conseillers').findOne({ '_id': conseillerFinalisee.conseillerObj._id });

      let onSuccess = () => {
        return db.collection('misesEnRelation').updateOne({ 'structure.$id': structure._id, 'conseiller.$id': conseiller._id }, {
          $set: {
            mailCnfsRuptureSentDate: new Date(),
            resendMailCnfsRupture: !!structure.mailSentDate,
          },
          $unset: {
            mailErrorCnfsRupture: '',
            mailErrorDetailCnfsRupture: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('misesEnRelation').updateOne({ 'structure.$id': structure._id, 'conseiller.$id': conseiller._id }, {
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

