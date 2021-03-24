const assert = require('assert');
const app = require('../../src/app');

describe('\'stats\' service', () => {
  it('registered the service', () => {
    const service = app.service('stats');

    assert.ok(service, 'Registered the service');
  });
});
