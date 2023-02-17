const app = require('../../src/app');
const assert = require('assert');

describe('\'accessLogs\' service', () => {
  it('registered the service', () => {
    const service = app.service('accessLogs');
    assert.ok(service, 'Registered the service');
  });
});
