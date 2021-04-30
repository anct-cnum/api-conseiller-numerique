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

  const templateName = 'bienvenueComptePrefet';
  let { utils } = mailer;

  let render = user => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getBackofficeUrl(`/login?role=prefet`),
    });
  };

  return {
    templateName,
    render,
    send: async user => {

      let onSuccess = () => { };

      let onError = async err => {
        Sentry.captureException(err);
      };
      return mailer.createMailer().sendEmail(
        user.name,
        {
          subject: 'Bienvenue chez Conseiller Numérique France services',
          body: await render(user),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
