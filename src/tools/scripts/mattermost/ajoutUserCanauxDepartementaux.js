const { program } = require('commander');
const { execute } = require('../../utils');
const departements = require('../../../../data/imports/departements-region.json');
const { loginAPI, joinChannel, getChannel } = require('../../../utils/mattermost');
const slugify = require('slugify');
require('dotenv').config();

execute(__filename, async ({ logger, Sentry, exit, app }) => {

  program.option('-i, --id <id>', 'id: id user d\'un admin de mattermost');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const id = program.id;

  if (!id) {
    exit('Paramètres invalides. Veuillez préciser un id d\'un compte existant');
    return;
  }

  try {
    const mattermost = app.get('mattermost');
    for (const departement of departements) {
      slugify.extend({ '-': ' ' });
      slugify.extend({ '\'': ' ' });
      const channelName = slugify(departement.dep_name, { replacement: '', lower: true });
      const token = await loginAPI({ mattermost });
      const resultChannel = await getChannel(mattermost, token, channelName);
      if (resultChannel) {
        await joinChannel(mattermost, token, resultChannel.data.id, id);
      }
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  exit();
});

