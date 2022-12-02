const CSVToJSON = require('csvtojson');
const { program } = require('commander');

const { searchUsersEmail, joinChannel } = require('../../../utils/mattermost');

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../../utils');

execute(__filename, async ({ app, logger, exit }) => {
  program.option('-c, --csv <path>', 'CSV file path');
  program.option('-a, --array <array>', 'array: lister les ids MM exemple: xxxx,yyyyy,zzzzz');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const arrayIdChannel = program.array;

  if (!arrayIdChannel) {
    exit('Paramètres invalides, veuillez saisir les ids des canaux');
    return;
  }

  logger.info('Ajout des utilisateurs dans les canaux Mattermost');
  let count = 0;
  let errors = 0;
  const resultArrayIdChannel = arrayIdChannel.split(',');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mattermost = app.get('mattermost');

  await new Promise(() => {
    readCSV(program.csv).then(async conseillers => {
      await new Promise(async () => {
        for (const conseiller of conseillers) {
          const emailUtilisateur = utilisateur['Email'];
          const search = await searchUsersEmail(mattermost, null, mattermost.hubTeamId, prefetEmail);
          if (search.data[0]?.id) {
            for (const idChannel of resultArrayIdChannel) {
              await joinChannel(mattermost, null, idChannel, search.data[0]?.id);
            }
            count++;
            await sleep(500);
          } else {
            errors++;
          }
        }
        logger.info(`${count} utilisateurs ont été ajoutés et ${errors} qui non présents dans le MM`);
        exit();
      });
    }).catch(error => {
      logger.error(error);
    });
  });
});
