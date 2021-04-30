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

  const templateName = 'bienvenueCompteAdmin';
  let { utils } = mailer;

  let render = async admin => {
    return mailer.render(__dirname, templateName, {
      admin,
      link: utils.getBackofficeUrl(`/login?role=admin`),
    });
  };

  return {
    templateName,
    render,
    send: async admin => {

      let onSuccess = () => { };

      let onError = async err => {
        Sentry.captureException(err);
      };

      return mailer.createMailer().sendEmail(
        admin.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(admin),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
