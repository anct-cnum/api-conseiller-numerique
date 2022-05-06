module.exports = (db, mailer) => {
  const templateName = 'mailRelanceM+1Structure';
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
              'groupeCRAHistorique.$.mailSendStructureM+1': true,
              'groupeCRAHistorique.$.dateMailSendStructureM+1': new Date()
            },
            $unset: {
              'groupeCRAHistorique.$.mailErrorStructureM+1': '',
              'groupeCRAHistorique.$.mailErrorDetailStructureM+1': ''
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
              'groupeCRAHistorique.$.mailErrorStructureM+1': 'smtpError',
              'groupeCRAHistorique.$.mailErrorDetailStructureM+1': err.message
            }
          });
        utils.setSentryError(err);
        throw err;
      };
      return mailer.createMailer().sendEmail(
        emailContactStructure,
        {
          subject: 'Rencontrez-vous des difficultés avec le Compte-Rendu d\'Activités ?',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
