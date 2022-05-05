const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = 'REPLACE WITH API-KEY'; //TO REPLACE
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const contactsList = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return contactsList;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../utils');

execute(__filename, async ({ logger, exit, Sentry }) => {
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async emails => {
      emails.forEach(email => {
        let p = new Promise(async () => {
          await apiInstance.smtpBlockedContactsEmailDelete(email.Contact);
          logger.info(email.Contact);
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
  exit();
});
