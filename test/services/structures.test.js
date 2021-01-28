const assert = require('assert');
const app = require('../../src/app');

describe('\'structures\' service', () => {
  it('registered the service', () => {
    const service = app.service('structures');

    assert.ok(service, 'Registered the service');
  });
});
