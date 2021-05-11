const assert = require('assert');
const app = require('../../src/app');

describe('\'cras\' service', () => {
  it('registered the service', () => {
    const service = app.service('cras');

    assert.ok(service, 'Registered the service');
  });
});
