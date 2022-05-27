module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1,5Structure';
  const { utils } = mailer;

  const render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async (conseiller, emailContactStructure) => {

      const onSuccess = () => {
        return db.collection('conseillers').updateOne(
          {
            '_id': conseiller._id,
            'groupeCRAHistorique': { '$elemMatch': { 'nbJourDansGroupe': { $exists: false } } },
          },
          {
            $set: {
              'groupeCRAHistorique.$.mailSendStructureM+1,5': true,
              'groupeCRAHistorique.$.dateMailSendStructureM+1,5': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorStructureM+1,5': '',
              'groupeCRAHistorique.$.mailErrorDetailStructureM+1,5': ''
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
              'groupeCRAHistorique.$.mailErrorStructureM+1,5': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailStructureM+1,5': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        emailContactStructure,
        {
          subject: '[IMPORTANT] Aucun Compte-Rendu d\'Activité complété depuis 45 jours',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
