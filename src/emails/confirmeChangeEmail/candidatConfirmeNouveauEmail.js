module.exports = (db, mailer) => {

  const templateName = 'candidatConfirmeNouveauEmail';
  let { utils } = mailer;


  let render = async user => {

    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCandidatUrl(`/candidat/confirmation-email/${(user.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {
      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': user._id }, {
          $unset: {
            mailConfirmError: '',
            mailConfirmErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            mailConfirmError: 'smtpError',
            mailConfirmErrorDetail: err.message
          }
        });
        throw err;
      };
      return mailer.createMailer().sendEmail(
        user.nouveauEmail,
        {
          subject: 'Confirmez votre nouvelle adresse mail',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
