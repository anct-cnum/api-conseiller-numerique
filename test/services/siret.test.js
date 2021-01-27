const assert = require('assert');
const app = require('../../src/app');

describe('\'siret\' service', () => {
  it('registered the service', () => {
    const service = app.service('siret');

    assert.ok(service, 'Registered the service');
  });
});
