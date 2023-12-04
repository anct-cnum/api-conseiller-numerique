module.exports = (db, mailer) => {

  const templateName = 'resetMotDePasseCnil';
  const { utils } = mailer;

  let render = async user => {
    if (user.roles[0] === 'conseiller') {
      return mailer.render(__dirname, templateName, {
        user,
        link: utils.getEspaceCoopUrl(`/renouveler-mot-de-passe/${(user.token)}`)
      });
    }
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCandidatUrl(`/renouveler-mot-de-passe/${(user.token)}`)
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
          subject: 'Renouvellement de votre mot de passe Conseiller Numérique',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
