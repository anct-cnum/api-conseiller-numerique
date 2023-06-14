const assert = require('assert');
const app = require('../../src/app');

describe('\'coordinateurs\' service', () => {
  it('registered the service', () => {
    const service = app.service('coordinateurs');

    assert.ok(service, 'Registered the service');
  });
});
