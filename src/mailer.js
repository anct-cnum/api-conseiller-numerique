const Joi = require('joi');
const _ = require('lodash');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const nodemailer = require('nodemailer');
const moment = require('moment');
const path = require('path');
const mjml = require('mjml');
const ejs = require('ejs');
const { promisify } = require('util');
const renderFile = promisify(ejs.renderFile);

module.exports = app => {

  const configuration = app.get('smtp');

  // let transporter = nodemailer.createTransport({
  //   name: configuration.hostname,
  //   host: configuration.host,
  //   port: configuration.port,
  //   secure: configuration.secure === 'true',
  //   greetingTimeout: parseInt(configuration.greetingTimeout),
  //   tls: {
  //     rejectUnauthorized: false
  //   },
  //   ...(!configuration.user ? {} : {
  //     auth: {
  //       user: configuration.user,
  //       pass: configuration.password
  //     }
  //   })
  // });

  let transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: 'f825cabc6a7eac',
      pass: '5376ed7a1bc35a'
    }
  });

  transporter.use('compile', htmlToText({ ignoreImage: true }));

  let getPublicUrl = path => `${app.get('public_hostname')}${path}`;

  let getBackofficeUrl = path => `${app.get('backoffice_hostname')}${path}`;

  let getEspaceCoopUrl = path => `${app.get('espace_coop_hostname')}${path}`;

  let getHelpUrl = app.get('help_url');


  let utils = {
    getPublicUrl,
    getBackofficeUrl,
    getEspaceCoopUrl,
    getHelpUrl,
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
        sendEmail: async (emailAddress, message, options = {}) => {

          const schema = await Joi.object({
            subject: Joi.string().required(),
            body: Joi.string().required(),
          }, { abortEarly: false });
          let { subject, body } = schema.validate(message).value;
          return transporter.sendMail(_.merge({}, {
            to: emailAddress,
            subject,
            from: `Conseiller Numérique France Services <${configuration.from}>`,
            replyTo: `Conseiller Numérique France Services <${configuration.replyTo}>`,
            list: {
              help: getPublicUrl('/faq'),
            },
            html: body,
          }, {
            ...options,
            ...(process.env.CNUM_MAIL_BCC ? { bcc: process.env.CNUM_MAIL_BCC } : {}),
          }));
        }
      };
    }
  };
};
