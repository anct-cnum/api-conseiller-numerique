module.exports = (db, mailer) => {

  const templateName = 'creationCompteStructure';
  let { utils } = mailer;

  let render = async structure => {
    const structureObj = await db.collection('structures').findOne({ _id: structure.entity.oid });
    console.log(structureObj);
    let nombreConseillersCoselec = 0;
    if (structureObj.coselec !== undefined && structureObj.coselec.length > 0) {
      nombreConseillersCoselec = structureObj.coselec[structureObj.coselec.length - 1].nombreConseillersCoselec;
    } else {
      nombreConseillersCoselec = structureObj.nombreConseillersPrefet;
    }
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
          subject: 'Créer votre compte utilisateur Conseiller Numérique France services',
          body: await render(structure),
        },
      )
      .then(onSuccess)
      .catch(onError);
    },
  };
};
