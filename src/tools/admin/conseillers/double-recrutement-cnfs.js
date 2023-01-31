const { program } = require('commander');
const { execute } = require('../../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-c, --conseiller <conseiller>', 'conseiller: id PG du conseiller');
  program.option('-s, --structure <sa>', 'id: id PG de la structure');
  program.option('-d, --date <date>', 'date: date prévisionel d\'embauche DD/MM/AAAA');
  program.option('-s, --statut <statut>', 'statut: nouvelle ou interessee ou recrutee');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const constroleDate = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
  const idPGConseiller = ~~program.conseiller;
  const idPGStructure = ~~program.structure;
  let datePrevisionnelle = program.date;
  let statut = program.statut;

  if ((idPGStructure === 0) || (idPGConseiller === 0) || (statut === 'recrutee' && !constroleDate.test(datePrevisionnelle)) || !statut) {
    exit('Paramètre invalide. Veuillez préciser un id conseiller & id structure ainsi que la date prévissionelle');
    return;
  }
  if (!['nouvelle', 'recrutee', 'interessee'].includes(statut)) {
    exit(`Le statut ${statut} est invalide. les statuts autorisés sont [nouvelle, recrutee, interessee]`);
    return;
  }
  try {

    const finaliseeRupture = await db.collection('misesEnRelation').findOne({
      'conseillerObj.idPG': idPGConseiller,
      'structureObj.idPG': idPGStructure,
      'statut': 'finalisee_rupture'
    });

    if (finaliseeRupture === null) {
      exit('Aucune mise en relation avec le statut finalisee_rupture existe !');
      return;
    }

    datePrevisionnelle = dayjs(datePrevisionnelle.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1'), 'YYYY-MM-DD').toDate();
    console.log('datePrevisionnelle:', datePrevisionnelle);
    const {
      dossierIncompletRupture,
      dateRupture,
      emetteurRupture,
      motifRupture,
      resendMailCnfsRupture,
      dateRecrutement,
      statut,
      transfert,
      validateurRupture,
      _id,
      ...misesEnRelation } = finaliseeRupture;

    if (statut === 'recrutee') {
      misesEnRelation.dateRecrutement = datePrevisionnelle;
    }

    await db.collection('misesEnRelation').insertOne({ ...misesEnRelation, statut });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Mises En relation bien créer pour la SA ${idPGStructure} avec le conseiller ${idPGConseiller} avec un statut ${statut}`);
  exit();
});

