const configuration = require('@feathersjs/configuration');
const Sentry = require('@sentry/node');
const config = configuration();

module.exports = (db, mailer) => {

  if (config().sentry.enabled === 'true') {
    Sentry.init({
      dsn: config().sentry.dsn,
      environment: config().sentry.environment,
      tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
    });
  }

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
