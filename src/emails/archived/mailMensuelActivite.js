module.exports = (db, mailer) => {
  const templateName = 'mailMensuelActivite';
  const templateNameNull = 'mailMensuelActiviteNull';
  const { utils } = mailer;

  const render = async (conseiller, cras) => {
    return mailer.render(__dirname, cras.nbAccompagnements > 0 ? templateName : templateNameNull, { conseiller, cras });
  };

  return {
    templateName,
    render,
    send: async (conseiller, cras) => {

      const onSuccess = () => {
        return db.collection('conseillers').updateOne({
          _id: conseiller._id
        }, {
          $set: {
            mailActiviteCRAMois: cras.mois
          }
        });
      };

      const onError = async err => {
        utils.setSentryError(err);
        throw err;
      };

      return mailer.createMailer().sendEmail(
        conseiller.emailCN.address,
        {
          subject: 'Mon activité du mois ' + cras.mois,
          body: await render(conseiller, cras),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
