module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1Conseiller';
  const { utils } = mailer;

  let render = async conseiller => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      let onSuccess = () => {
        return db.collection('conseillers').updateOne(
          {
            '_id': conseiller._id,
            'groupeCRAHistorique': { '$elemMatch': { 'nbJourDansGroupe': { $exists: false } } },
          },
          {
            $set: {
              'groupeCRAHistorique.$.mailSendM+1': true,
              'groupeCRAHistorique.$.dateMailSendM+1': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorM+1': '',
              'groupeCRAHistorique.$.mailErrorDetailM+1': ''
            },
          });
      };

      let onError = async err => {
        await db.collection('conseillers').updateOne(
          {
            '_id': conseiller._id,
            'groupeCRAHistorique': { '$elemMatch': { 'nbJourDansGroupe': { $exists: false } } }
          },
          {
            $set: {
              'groupeCRAHistorique.$.mailErrorM+1': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailM+1': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.emailCN.address,
        {
          subject: 'Vous ne remplissez pas vos CRA !',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
