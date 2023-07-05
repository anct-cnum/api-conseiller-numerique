require('dotenv').config();
const csvToJson = require('csvtojson');
const { program } = require('commander');
program.version('0.0.1');
const { execute } = require('../../utils');
const { findCommonSiret } = require('./aidants-connect.core');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath =>
  csvToJson({
    delimiter: ';',
    includeColumns: /SIRET/
  }).fromFile(filePath);

const getSiretList = db => async () =>
  await db.collection('structures')
  .find({
    statut: 'VALIDATION_COSELEC'
  })
  .project({
    _id: 0,
    siret: 1
  })
  .toArray();

const setAidantConnectLabel = db => async siret => {
  await db.collection('structures').updateMany(
    {
      siret
    },
    {
      $set: {
        estLabelliseAidantsConnect: 'OUI'
      }
    }
  );
};

execute(__filename, async ({ db, exit }) => {
  const siretListFromCSV = (await readCSV(program.csv))
  .map(siretRow => Object.values(siretRow)[0])
  .filter(siret => siret !== '');

  const siretListFromDB = (await getSiretList(db)())
  .map(siretRow => Object.values(siretRow)[0])
  .filter(siret => siret !== null);

  await findCommonSiret(siretListFromCSV, siretListFromDB)
  .map(siret => setAidantConnectLabel(db)(siret));

  exit();
});
