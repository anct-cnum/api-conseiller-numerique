module.exports = (db, mailer) => {

  let { utils } = mailer;
  const templateName = 'ouvertureEspaceCoopStructure';

  let render = async () => {
    return mailer.render(__dirname, templateName, { });
  };

  return {
    templateName,
    render,
    send: async structure => {

      let onSuccess = () => {};

      let onError = async err => {
        utils.setSentryError(err);
      };
      return mailer.createMailer().sendEmail(
        structure.contact.email,
        {
          subject: 'Ouverture du portail de la communauté des Conseillers numériques France Services, l’Espace Coop.',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
