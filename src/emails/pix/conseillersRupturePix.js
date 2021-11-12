const { Parser } = require('json2csv');
const jsonToCsvParser = new Parser({ delimiter: ';', withBOM: true });

module.exports = (db, mailer, app) => {

  const templateName = 'conseillersRupturePix';
  let { utils } = mailer;

  let render = () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    templateName,
    render,
    send: async conseillers => {
      let onSuccess = () => { };

      let onError = async err => {
        app.get('sentry').captureException(err);
      };

      return mailer.createMailer().sendEmail(
        utils.getPixContactMail(),
        {
          subject: 'Conseillers en rupture de contrat',
          body: await render()
        },
        { attachments: [{
          filename: 'ListeConseillersRupture.csv',
          content: jsonToCsvParser.parse(conseillers, ['Prénom', 'Nom', 'Email personnelle', 'Email professionnelle'])
        }]
        }
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
