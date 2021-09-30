const assert = require('assert');
const app = require('../../src/app');

describe('\'ressources\' service', () => {
  it('registered the service', () => {
    const service = app.service('ressources');

    assert.ok(service, 'Registered the service');
  });
});
