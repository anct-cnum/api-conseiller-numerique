module.exports = (db, mailer) => {

  const templateName = 'resetMotDePasseCnil';
  const { utils } = mailer;

  let render = async user => {
    // eslint-disable-next-line max-len
    const link = user.roles.includes('conseiller') ? utils.getEspaceCoopUrl(`/renouveler-mot-de-passe/${(user.token)}`) : utils.getEspaceCandidatUrl(`/renouveler-mot-de-passe/${(user.token)}`);
    return mailer.render(__dirname, templateName, {
      user,
      link
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
          subject: 'Renouvellement de votre mot de passe Conseiller numérique',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
