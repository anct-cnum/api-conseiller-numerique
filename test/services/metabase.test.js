const assert = require('assert');
const app = require('../../src/app');

describe('\'metabase\' service', () => {
  it('registered the service', () => {
    const service = app.service('metabase');

    assert.ok(service, 'Registered the service');
  });
});
