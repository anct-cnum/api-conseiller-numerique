const assert = require('assert');

describe('Load configuration files', () => {
  it('Application configuration', () => {
    const defaultConf = require('../../config/default.json');
    assert.notStrictEqual(defaultConf, null);
    const productionConf = require('../../config/production.json');
    assert.notStrictEqual(productionConf, null);
    const testConf = require('../../config/test.json');
    assert.notStrictEqual(testConf, null);
  });
  it('Clever cloud configuration', () => {
    const cron = require('../../clevercloud/cron.json');
    assert.notStrictEqual(cron, null);
  });
});
