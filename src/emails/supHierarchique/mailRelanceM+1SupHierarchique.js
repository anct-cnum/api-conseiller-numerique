module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1SupHierarchique';
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
              'groupeCRAHistorique.$.mailSendSupHierarchiqueM+1': true,
              'groupeCRAHistorique.$.dateMailSendSupHierarchiqueM+1': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorSupHierarchiqueM+1': '',
              'groupeCRAHistorique.$.mailErrorDetailSupHierarchiqueM+1': ''
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
              'groupeCRAHistorique.$.mailErrorSupHierarchiqueM+1': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailSupHierarchiqueM+1': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.supHierarchique.email,
        {
          subject: 'Rencontrez-vous des difficultés avec le Compte-Rendu d\'Activités ?',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
