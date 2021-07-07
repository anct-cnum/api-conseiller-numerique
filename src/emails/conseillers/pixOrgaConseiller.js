module.exports = (db, mailer) => {
  const templateName = 'pixOrgaConseiller';
  let { utils } = mailer;

  let render = async (user, conseiller) => {
    return mailer.render(__dirname, templateName, {
      link: utils.getPixUrl(`?control1714940=${conseiller?.prenom}&control1714939=${conseiller?.nom}&control1714941=${user?.name}`),
    });
  };

  return {
    templateName,
    render,
    send: async (user, conseiller) => {
      let onSuccess = () => { };

      let onError = async err => {
        throw err;
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Nouvel outil dans votre espace Coop : vous êtes invité(e) à rejoindre Pix Orga',
          body: await render(user, conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
