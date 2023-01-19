module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1,5SupHierarchique';
  const { utils } = mailer;

  const render = async conseiller => {
    return mailer.render(__dirname, 'mailRelanceM+1,5Structure', { conseiller });
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
              'groupeCRAHistorique.$.mailSendSupHierarchiqueM+1,5': true,
              'groupeCRAHistorique.$.dateMailSendSupHierarchiqueM+1,5': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorSupHierarchiqueM+1,5': '',
              'groupeCRAHistorique.$.mailErrorDetailSupHierarchiqueM+1,5': ''
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
              'groupeCRAHistorique.$.mailErrorSupHierarchiqueM+1,5': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailSupHierarchiqueM+1,5': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.supHierarchique.email,
        {
          subject: '[IMPORTANT] Aucun Compte-Rendu d\'Activité complété depuis 45 jours',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
