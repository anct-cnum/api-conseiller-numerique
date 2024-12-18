module.exports = (db, mailer) => {

  const templateName = 'motDePasseOublie';
  const { utils } = mailer;

  let render = async user => {
    const rolesCoop = ['conseiller', 'candidat'];
    if (rolesCoop.includes(user.roles[0])) {
      return mailer.render(__dirname, templateName, {
        user,
        link: utils.getEspaceCandidatUrl(`/renouveler-mot-de-passe/${(user.token)}`)
      });
    } else {
      return mailer.render(__dirname, templateName, {
        user,
        link: utils.getBackofficeUrl(`/renouveler-mot-de-passe/${(user.token)}`)
      });
    }

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
          subject: 'Renouvellement de votre mot de passe Conseiller Numérique',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
