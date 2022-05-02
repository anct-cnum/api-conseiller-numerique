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
              'groupeCRAHistorique.$.mailSendConseillerM+1': true,
              'groupeCRAHistorique.$.dateMailSendConseillerM+1': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorConseillerM+1': '',
              'groupeCRAHistorique.$.mailErrorDetailConseillerM+1': ''
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
              'groupeCRAHistorique.$.mailErrorConseillerM+1': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailConseillerM+1': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.emailCN.address,
        {
          subject: 'N\'oubliez pas de remplir votre Compte-Rendu d\'Activité !',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
