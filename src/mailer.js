const Joi = require('joi');
const merge = require('lodash.merge');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const nodemailer = require('nodemailer');
const moment = require('moment');
const path = require('path');
const mjml = require('mjml');
const ejs = require('ejs');
const { promisify } = require('util');
const renderFile = promisify(ejs.renderFile);

const configuration = require('@feathersjs/configuration');
const config = configuration();
const Sentry = require('@sentry/node');

module.exports = app => {

  const configuration = app.get('smtp');

  let transporter = nodemailer.createTransport({
    name: configuration.hostname,
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure === 'true',
    greetingTimeout: parseInt(configuration.greetingTimeout),
    tls: {
      rejectUnauthorized: false
    },
    ...(!configuration.user ? {} : {
      auth: {
        user: configuration.user,
        pass: configuration.password
      }
    })
  });

  transporter.use('compile', htmlToText({ ignoreImage: true }));

  let getPublicUrl = path => `${app.get('public_hostname')}${path}`;

  let getBackofficeUrl = path => `${app.get('backoffice_hostname')}${path}`;

  let getEspaceCoopUrl = path => `${app.get('espace_coop_hostname')}${path}`;

  let getEspaceCandidatUrl = path => `${app.get('espace_candidat_hostname')}${path}`;

  let getPixUrl = path => `${app.get('pix').hostname}${path}`;
  const getPixContactMail = () => app.get('pix').contactMailing;
  const getPixSupportMail = () => app.get('pix').supportMailing;
  const getSupportMail = () => configuration.replyTo;

  const setSentryError = err => {
    if (config().sentry.enabled === 'true') {
      Sentry.init({
        dsn: config().sentry.dsn,
        environment: config().sentry.environment,
        tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
      });
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.errorHandler());
      app.set('sentry', Sentry);

      app.get('sentry').captureException(err);
    }
  };

  let getHelpUrl = app.get('help_url');

  let utils = {
    getPublicUrl,
    getBackofficeUrl,
    getEspaceCoopUrl,
    getEspaceCandidatUrl,
    getPixUrl,
    getHelpUrl,
    getPixContactMail,
    getPixSupportMail,
    getSupportMail,
    setSentryError,
  };

  return {
    utils,
    render: async (rootDir, templateName, data = {}) => {
      let mjmlTemplate = await renderFile(path.join(rootDir, `${templateName}.mjml.ejs`), {
        ...data,
        templateName,
        utils: { moment, ...utils },
      });
      return mjml(mjmlTemplate, { }).html;
    },
    createMailer: () => {
      return {
        sendEmail: async (emailAddress, message, options = {}, carbonCopy = null) => {

          const schema = await Joi.object({
            subject: Joi.string().required(),
            body: Joi.string().required(),
          }, { abortEarly: false });
          let { subject, body } = schema.validate(message).value;
          return transporter.sendMail(merge({}, {
            to: emailAddress,
            subject,
            from: `Conseiller Numérique <${configuration.from}>`,
            replyTo: `Conseiller Numérique <${configuration.replyTo}>`,
            list: {
              help: getPublicUrl('/faq'),
            },
            html: body,
            ...(carbonCopy !== null ? { cc: carbonCopy } : {})
          }, {
            ...options,
            ...(process.env.CNUM_MAIL_BCC ? { bcc: process.env.CNUM_MAIL_BCC } : {}),
          }));
        }
      };
    }
  };
};
