module.exports = (db, mailer) => {
  const utilsStructure = require('../../utils/index.js');

  const templateName = 'testSentry';
  let { utils } = mailer;

  let render = async structure => {
    const structureObj = await db.collection('structures').findOne({ _id: structure.entity.oid });
    const coselec = utilsStructure.getCoselec(structureObj);
    const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;

    return mailer.render(__dirname, templateName, {
      structure,
      nombreConseillersCoselec,
      link: utils.getBackofficeUrl(`/inscription/${(structure.token)}`),
    });
  };

  return {
    templateName,
    render,
    send: async structure => {

      let onSuccess = () => {
        return db.collection('users').updateOne({ '_id': structure._id }, {
          $set: {
            mailSentDate: new Date(),
            resend: !!structure.mailSentDate,
          },
          $unset: {
            mailError: '',
            mailErrorDetail: ''
          },
        });
      };

      let onError = async err => {
        await db.collection('users').updateOne({ '_id': structure._id }, {
          $set: {
            mailError: 'smtpError',
            mailErrorDetail: err.message
          }
        });
        throw err;
      };
      return mailer.createMailer().sendEmail(
        structure.name,
        {
          subject: 'Activation de votre espace structure',
          body: await render(structure),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
