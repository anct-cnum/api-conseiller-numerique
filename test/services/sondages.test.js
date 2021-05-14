const assert = require('assert');
const app = require('../../src/app');

describe('\'sondages\' service', () => {
  it('registered the service', () => {
    const service = app.service('sondages');

    assert.ok(service, 'Registered the service');
  });
});
