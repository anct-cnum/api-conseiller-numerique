module.exports = (db, mailer) => {

  const templateName = 'renouvellementCompte';
  const { utils } = mailer;

  let render = async user => {
    const rolesCoop = ['conseiller', 'hub_coop', 'coordinateur_coop'];
    const link = !rolesCoop.includes(user.roles[0]) ? utils.getBackofficeUrl(`/login?role=${(user.roles[0])}`) : utils.getEspaceCoopUrl(`/login`);
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
