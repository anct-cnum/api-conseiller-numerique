describe('Load configuration files', () => {
  it('Application configuration', () => {
    const defaultConf = require('../../config/default.json');
    const localConf = require('../../config/local.json');
    const productionConf = require('../../config/production.json');
    const testConf = require('../../config/test.json');
  });
  it('Clever cloud configuration', () => {
    const cron = require('../../clevercloud/cron.json');
  });
});
