module.exports = (db, mailer) => {

  const templateName = 'renouvellementCompteCandidat';
  const { utils } = mailer;

  let render = async user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCandidatUrl(`/login`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      let onSuccess = () => { };

      let onError = async err => {
        utils.setSentryError(err);
      };

      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Votre mot de passe sur l\'espace candidat conseiller numérique a été renouvelé avec succès',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
