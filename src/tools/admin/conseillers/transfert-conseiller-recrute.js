const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');
const utils = require('../../../utils/index');
require('dotenv').config();
// node src/tools/admin/conseillers/transfert-conseiller-recrute.js --id 604218f74959f620858b9b98 -a 604218a04959f620858b9224 -n 604218a04959f620858b921f
execute(__filename, async ({ db, logger, Sentry, exit }) => {

  // program.option('-c, --conseiller <conseiller>', 'conseiller : id Mongo du conseiller à transferer');
  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transferer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = new ObjectID(program.id);
  let ancienneSA = new ObjectID(program.ancienne);
  let nouvelleSA = new ObjectID(program.nouvelle);

  if (!id || !ancienneSA || !nouvelleSA) {
    exit('Paramètres invalides. Veuillez préciser un id et un nombre en kilomètre');
    return;
  }

  // Phase de contrôle :
  const cnfsRecrute = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': id, 'structure.$id': ancienneSA, 'statut': 'finalisee' });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${id} n'est pas recruté.`);
    return;
  }
  const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });

  if (structureDestination.statut !== 'VALIDATION_COSELEC') {
    exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
    return;
  }
  let dernierCoselec = utils.getCoselec(structureDestination);
  const misesEnRelationRecrutees = await db.collection('misesEnRelation').countDocuments({
    'statut': { $in: ['recrutee', 'finalisee'] },
    'structure.$id': structureDestination._id
  });
  if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec) {
    //eslint-disable-next-line max-len
    exit(`La structure destinataire est seulement autorisé à ${dernierCoselec.nombreConseillersCoselec} et à déjà ${misesEnRelationRecrutees} validé(s)/recrutée(s)`);
    return;
  }
  // Checker si conseiller bien recruté avec la structure d'origine (statut finalisee)
  // Checker si la structure de destination existe bien + bien validée Coselec + quota
  exit();
});
