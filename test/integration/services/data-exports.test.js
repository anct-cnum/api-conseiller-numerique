const assert = require('assert');
const app = require('../../../src/app');

describe('\'dataExports\' service', () => {
  it('registered the service', () => {
    const service = app.service('data-exports');

    assert.ok(service, 'Registered the service');
  });
});
