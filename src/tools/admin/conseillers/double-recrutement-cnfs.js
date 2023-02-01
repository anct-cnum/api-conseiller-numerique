const { program } = require('commander');
const { execute } = require('../../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-c, --conseiller <conseiller>', 'conseiller: id PG du conseiller');
  program.option('-s, --structure <structure>', 'id: id PG de la structure');
  program.option('-d, --date <date>', 'date: date prévisionnelle d\'embauche DD/MM/AAAA');
  program.option('-s, --statut <statut>', 'statut: interessee ou recrutee');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const controleDate = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
  const idPGConseiller = ~~program.conseiller;
  const idPGStructure = ~~program.structure;
  let datePrevisionnelle = program.date;
  let statut = program.statut;

  // eslint-disable-next-line max-len
  if ((idPGStructure === 0) || (idPGConseiller === 0) || (statut === 'recrutee' && !controleDate.test(datePrevisionnelle)) || !['recrutee', 'interessee'].includes(statut)) {
    exit('Paramètres invalides. Veuillez préciser un statut, un id conseiller & id structure ainsi que la date prévisionnelle si statut recrutee');
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
    const finalisee = await db.collection('misesEnRelation').findOne({
      'conseillerObj.idPG': idPGConseiller,
      'statut': 'finalisee'
    });

    if (finalisee) {
      exit(`Le conseiller est déjà RECRUTE par la structure ${finalisee?.structureObj.idPG}`);
      return;
    }

    datePrevisionnelle = dayjs(datePrevisionnelle.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1'), 'YYYY-MM-DD').toDate();

    let misesEnRelation = {
      conseiller: finaliseeRupture.conseiller,
      structure: finaliseeRupture.structure,
      statut,
      createdAt: new Date(),
      conseillerCreatedAt: finaliseeRupture.conseillerObj.createdAt,
      conseillerObj: finaliseeRupture.conseillerObj,
      structureObj: finaliseeRupture.structureObj,
      type: 'MANUEL',
    };

    if (statut === 'recrutee') {
      misesEnRelation.dateRecrutement = datePrevisionnelle;
    }

    await db.collection('misesEnRelation').insertOne(misesEnRelation);

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Mises En relation bien créée pour la SA ${idPGStructure} avec le conseiller ${idPGConseiller} avec un statut ${statut}`);
  exit();
});

