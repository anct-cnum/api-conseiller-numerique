const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const { execute } = require('../utils');
const SibApiV3Sdk = require('sib-api-v3-sdk');

program.option('-c_sib, --csv_sib <path>', 'CSV contact SIB file path');
program.option('-c_mm, --csv_mattermost <path>', 'CSV mattermost file path');
program.parse(process.argv);

const deleteMailSib = async (email, logger, apiInstance) => {
  try {
    await apiInstance.deleteContact(email);
  } catch (error) {
    logger.error(`Erreur contact SIB : ${error.message}`);
  }
};

const readCSV = async filePath => {
  try {
    const contactsList = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return contactsList;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ logger, db, exit, app }) => {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = app.get('sib_api_key');
  const apiInstance = new SibApiV3Sdk.ContactsApi();
  const promises = [];
  let countConseillerDelete = 0;
  const conseillersMattermost = await readCSV(program.csv_mattermost);

  try {
    await readCSV(program.csv_sib).then(async exportContactSib => {
      exportContactSib.forEach(contactSib => {
        promises.push(new Promise(async resolve => {
          const countConseillerBefore = await db.collection('conseillers').countDocuments({
            $or: [
              { 'emailCN.address': contactSib.email },
              { 'email': contactSib.email }
            ],
          });
          const countStructureBefore = await db.collection('structures').countDocuments({
            'contact.email': contactSib.email,
          });
          const countUserBefore = await db.collection('users').countDocuments({
            'name': contactSib.email
          });
          const countMattermost = conseillersMattermost.find(conseillerMM => conseillerMM.email === contactSib.email);
          if (countConseillerBefore === 0 && countStructureBefore === 0 && countUserBefore === 0 && countMattermost === undefined) {
            countConseillerDelete += 1;
            await deleteMailSib(contactSib.email, logger, apiInstance);
          }
          resolve();
        }));
      });
    });
  } catch (error) {
    logger.error(error);
  }
  await Promise.all(promises);
  logger.info(`${countConseillerDelete} ont été supprimés de la liste des contacts`);
  exit();
});
