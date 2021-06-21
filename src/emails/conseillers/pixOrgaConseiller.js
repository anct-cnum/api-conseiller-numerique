module.exports = (db, mailer) => {
  const templateName = 'pixOrgaConseiller';
  let { utils } = mailer;

  let render = async conseiller => {

    return mailer.render(__dirname, templateName, {
      link: utils.getPixUrl(`?control1714940=${conseiller?.prenom}&control1714939=${conseiller?.nom}&control1714941=${conseiller?.email}`),
    });
  };

  return {
    templateName,
    render,
    send: async conseiller => {
      console.log(conseiller);
      let onSuccess = () => {
      };

      let onError = async err => {
        throw err;
      };
      return mailer.createMailer().sendEmail(
        conseiller.email,
        {
          subject: 'Nouvel outil dans votre espace Coop : vous êtes invité(e) à rejoindre Pix Orga',
          body: await render(conseiller),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
