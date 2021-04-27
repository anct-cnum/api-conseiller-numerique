const assert = require('assert');
const app = require('../../../src/app');

describe('\'conseillers\' service', () => {
  it('registered the service', () => {
    const service = app.service('conseillers');

    assert.ok(service, 'Registered the service');
  });
});
