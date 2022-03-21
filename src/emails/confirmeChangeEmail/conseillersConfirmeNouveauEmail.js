module.exports = (db, mailer) => {

  const templateName = 'conseillersConfirmeNouveauEmail';
  const { utils } = mailer;


  let render = async conseiller => {

    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getPublicUrl(`/conseillers/confirmation-email/${(conseiller.tokenChangementMail)}`),
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {
      let onSuccess = () => {
        return db.collection('conseillers').updateOne({ '_id': conseiller._id }, {
          $unset: {
            mailConfirmError: '',
            mailConfirmErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('conseillers').updateOne({ '_id': conseiller._id }, {
          $set: {
            mailConfirmError: 'smtpError',
            mailConfirmErrorDetail: err.message
          }
        });

        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.nouveauEmail,
        {
          subject: 'Confirmez votre nouvelle adresse mail',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
