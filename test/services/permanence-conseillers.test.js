const assert = require('assert');
const app = require('../../src/app');

describe('\'permanence-conseillers\' service', () => {
  it('registered the service', () => {
    const service = app.service('permanence-conseillers');

    assert.ok(service, 'Registered the service');
  });
});
