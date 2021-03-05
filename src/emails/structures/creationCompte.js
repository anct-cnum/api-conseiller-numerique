module.exports = (db, mailer) => {

  const templateName = 'creationCompte';
  let { utils } = mailer;

  let render = structure => {
    return mailer.render(__dirname, templateName, {
      structure,
      link: utils.getBackofficeUrl(`/inscription/${(structure.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async structure => {

      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': structure._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!structure.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': structure._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        throw err;
      };
      return mailer.createMailer().sendEmail(
        structure.name,
        {
          subject: 'Créer votre compte utilisateur Conseiller Numérique France services',
          body: await render(structure),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
