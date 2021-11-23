const { program } = require('commander');
const { execute } = require('../../utils');
const dayjs = require('dayjs');

const formatDate = date => {
  return dayjs(date, 'YYYY-MM-DD').toDate();
};

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-d, --date <type>', 'date : date de naissance sous le format AAAA/MM/DD');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const id = Number(program.id);
  const date = formatDate(program.date);

  if (id === 0 || !date) {
    exit('Paramètres invalides. Veuillez préciser un id et une date de naissance');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { dateDeNaissance: date } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: { 'conseillerObj.dateDeNaissance': date }
      });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  // eslint-disable-next-line max-len
  logger.info(`Date de naissance mis à jour pour le conseiller avec l'idPG: ${conseiller.idPG} qui avait une date: ${formatDate(conseiller.dateDeNaissance)} remplacer par ${date}`);
  exit();
});
