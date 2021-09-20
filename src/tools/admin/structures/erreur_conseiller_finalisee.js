const { program } = require('commander');
const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-s, --statut <statut>', 'statut : nouvelle');
  program.option('-ic, --idConseiller <idConseiller>', 'id: idPG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idConseiller = ~~program.idConseiller;
  let statut = program.statut;

  if (!idConseiller || !statut) {
    exit('Paramètres invalides. Veuillez préciser un idConseiller et un statut');
    return;
  } else if (!['nouvelle'].includes(statut)) {
    exit('Statut invalide.');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: idConseiller, statut: 'RECRUTEE' });

  if (!conseiller) {
    exit('conseiller inconnu dans MongoDB');
    return;
  }

  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id, 'statut': { $in: ['finalisee', 'finalisee_non_disponible'] } }, {
    $set: {
      statut: 'nouvelle',
    }
  }, { multi: true });

  await db.collection('conseillers').updateOne({ '_id': conseiller._id }, {
    $set: {
      disponible: true,
      estRecrute: false,
    },
    $unset: {
      statut: 1,
      datePrisePoste: 1,
      dateFinFormation: 1,
      structureId: 1,
      idStructure: 1,
      mattermost: 1,
      emailCN: 1,
    }
  });

  const conseillerCompte = await db.collection('users').findOne({ 'entity.$id': conseiller._id, 'roles': 'conseiller', 'passwordCreated': true });
  if (conseillerCompte) {
    // TODO pour ajouter la suppression mattermost + Coop + Webmail si ça était creer ou non
  }

  logger.info('Statut mis à jour');
  exit();
  // node src/tools/admin/structures/erreur_conseiller_finalisee.js --idConseiller 45 --idStructure 993 --statut nouvelle
});
