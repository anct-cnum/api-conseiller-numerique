const assert = require('assert');
const app = require('../../../src/app');

describe('\'misesEnRelation\' service', () => {
  it('registered the service', () => {
    const service = app.service('misesEnRelation');

    assert.ok(service, 'Registered the service');
  });
});
