const Sentry = require('@sentry/node');

module.exports = (db, mailer) => {

  const templateName = 'bienvenueCompteStructure';
  let { utils } = mailer;

  let render = async structure => {
    return mailer.render(__dirname, templateName, {
      structure,
      link: utils.getBackofficeUrl(`/login?role=structure`),
    });
  };

  return {
    templateName,
    render,
    send: async structure => {

      let onSuccess = () => {};

      let onError = async err => {
        Sentry.captureException(err);
      };
      return mailer.createMailer().sendEmail(
        structure.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(structure),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
