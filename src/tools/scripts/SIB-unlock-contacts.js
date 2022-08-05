const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const SibApiV3Sdk = require('sib-api-v3-sdk');

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

const { execute } = require('../utils');

execute(__filename, async ({ logger, app }) => {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = app.get('sib_api_key');
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  await new Promise(() => {
    readCSV(program.csv).then(async emails => {

      // Conservation des emails sans doublon
      let emailsList = emails.map(email => email.Contact);
      emailsList = [...new Set(emailsList)];

      for (let email of emailsList) {
        logger.info(email);
        await apiInstance.smtpBlockedContactsEmailDelete(email);
        await sleep(500);
      }
    });
  });
});
