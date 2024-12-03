module.exports = (db, mailer) => {

  const templateName = 'renouvellementCompte';
  const { utils } = mailer;

  let render = async user => {
    const link = utils.getEspaceCandidatUrl(`/login`);
    return mailer.render(__dirname, templateName, {
      user,
      link: link,
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
        user.persoEmail ?? user.name,
        {
          subject: 'Votre mot de passe Conseiller Numérique a été renouvelé avec succès',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
