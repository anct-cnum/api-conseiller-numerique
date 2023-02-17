const app = require('../../src/app');

describe('\'accessLogs\' service', () => {
  it('registered the service', () => {
    const service = app.service('accessLogs');
    expect(service).toBeTruthy();
  });
});
