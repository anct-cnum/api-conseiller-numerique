const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const { execute } = require('../utils');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const deleteMailSib = async (email, logger, apiInstance) => {
  try {
    await apiInstance.deleteContact(email);
  } catch (error) {
    logger.error(`Erreur DB for delete Conseiller : ${error.message}`);
  }
};

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const contactsList = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return contactsList;
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ logger, db, exit }) => {
  const SibApiV3Sdk = require('sib-api-v3-sdk');
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = 'YOUR API KEY'; //TO REPLACE
  const apiInstance = new SibApiV3Sdk.ContactsApi();
  const promises = [];
  let countConseillerDelete = 0;

  try {
    await readCSV(program.csv).then(async exportConseillersSib => {
      exportConseillersSib.forEach(conseiller => {
        promises.push(new Promise(async resolve => {
          const countConseillerBefore = await db.collection('conseillers').countDocuments({
            $or: [
              { 'emailCN.address': conseiller.email },
              { 'email': conseiller.email }
            ],
          });
          const countStructureBefore = await db.collection('structures').countDocuments({
            'contact.email': conseiller.email,
          });
          const countUserBefore = await db.collection('users').countDocuments({
            'name': conseiller.email
          });
          if (countConseillerBefore === 0 && countStructureBefore === 0 && countUserBefore === 0) {
            countConseillerDelete += 1;
            deleteMailSib(conseiller.email, logger, apiInstance);
          }
          resolve();
        }));
      });
    });
  } catch (error) {
    logger.error(error);
  }
  await Promise.all(promises);
  logger.info(`${countConseillerDelete} ont été supprimé de la liste des contacts`);
  exit();
});
