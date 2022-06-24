module.exports = (db, mailer) => {

  const templateName = 'bienvenueCompteCoordinateur';
  const { utils } = mailer;

  const render = () => {
    return mailer.render(__dirname, templateName, {
      link: utils.getEspaceCoopUrl(`/login`)
    });
  };

  return {
    templateName,
    render,
    send: async (email, id) => {

      const onSuccess = async () => {
        await db.collection('users').updateOne(
          { '_id': id },
          { $set: { 'mailCoordinateurSent': true } });
      };

      const onError = async err => {
        utils.setSentryError(err);
        console.log(err);
      };
      return mailer.createMailer().sendEmail(
        email,
        {
          subject: 'Bienvenue sur votre espace Admin Coop',
          body: await render(),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
