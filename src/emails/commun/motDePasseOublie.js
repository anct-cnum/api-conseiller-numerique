module.exports = (db, mailer) => {

  const templateName = 'motDePasseOublie';
  const { utils } = mailer;

  let render = async user => {
    if (user.roles[0] === 'conseiller' || user.roles[0] === 'hub_coop' || user.roles[0] === 'coordinateur_coop') {
      return mailer.render(__dirname, templateName, {
        user,
        link: utils.getEspaceCoopUrl(`/renouveler-mot-de-passe/${(user.token)}`)
      });
    } else if (user.roles[0] === 'candidat') {
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
          subject: 'Renouvellement de votre mot de passe Conseiller Numérique France services',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
