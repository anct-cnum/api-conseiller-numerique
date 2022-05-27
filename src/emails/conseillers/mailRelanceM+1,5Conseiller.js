module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1,5Conseiller';
  const { utils } = mailer;

  const render = async conseiller => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    templateName,
    render,
    send: async conseiller => {

      const onSuccess = () => {
        return db.collection('conseillers').updateOne(
          {
            '_id': conseiller._id,
            'groupeCRAHistorique': { '$elemMatch': { 'nbJourDansGroupe': { $exists: false } } },
          },
          {
            $set: {
              'groupeCRAHistorique.$.mailSendConseillerM+1,5': true,
              'groupeCRAHistorique.$.dateMailSendConseillerM+1,5': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorConseillerM+1,5': '',
              'groupeCRAHistorique.$.mailErrorDetailConseillerM+1,5': ''
            },
          });
      };

      const onError = async err => {
        await db.collection('conseillers').updateOne(
          {
            '_id': conseiller._id,
            'groupeCRAHistorique': { '$elemMatch': { 'nbJourDansGroupe': { $exists: false } } }
          },
          {
            $set: {
              'groupeCRAHistorique.$.mailErrorConseillerM+1,5': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailConseillerM+1,5': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.emailCN.address,
        {
          subject: '[IMPORTANT] Aucun compte-rendu d\'activité enregistré depuis 45 jours',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
