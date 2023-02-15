const app = require('../../src/app');

describe('\'logs\' service', () => {
  it('registered the service', () => {
    const service = app.service('logs');
    expect(service).toBeTruthy();
  });
});
