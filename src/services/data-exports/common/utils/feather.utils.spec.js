const { Forbidden, NotAuthenticated, Unprocessable } = require('@feathersjs/errors');
const {
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  canActivate, Role, activateRoute, authenticationFromRequest, userIdFromRequestJwt, abort, csvFileResponse
} = require('./feather.utils');

class Response {
  constructor() {
    this._headers = new Map();
  }

  setHeader(name, value) {
    this._headers.set(name, value);
    return this;
  }

  set(name, value) {
    this._headers.set(name, value);
    return this;
  }

  status(status) {
    this._status = status;
    return this;
  }

  send(result) {
    this._body = result;
  }
}

describe('can activate route checks', () => {
  it('should get authentication from request', () => {
    const authentication = {
      strategy: 'jwt',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc'
    };

    const req = {
      feathers: {
        authentication: authentication
      }
    };

    expect(authenticationFromRequest(req)).toEqual(authentication);
  });

  it('should get empty object when cannot find feathers in request', () => {
    const req = {};

    expect(authenticationFromRequest(req)).toEqual({});
  });

  it('should get user id from request jwt', () => {
    const userId = '1234567890';
    const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc';
    const req = {
      feathers: {
        authentication: { accessToken }
      }
    };

    expect(userIdFromRequestJwt(req)).toEqual(userId);
  });

  it('should make an abort response', async () => {
    const routeActivation = await canActivate(
      authenticationGuard(undefined)
    );

    const res = new Response();

    abort(res, routeActivation);

    expect({
      status: res._status,
      body: res._body,
    }).toEqual({
      status: 401,
      body: (new NotAuthenticated('User not authenticated')).toJSON()
    });
  });

  it('should make a csv response', () => {
    const res = new Response();
    const fileName = 'test.csv';
    const fileContent = 'This is a test';

    csvFileResponse(res, fileName, fileContent);

    expect({
      headers: res._headers,
      status: res._status,
      body: res._body,
    }).toEqual({
      headers: new Map([
        ['Content-disposition', `attachment; filename=${fileName}`],
        ['Content-Type', 'text/csv'],
      ]),
      status: 200,
      body: fileContent
    });
  });

  it('should not get authentication error when authentication data is provided', async () => {
    const authentication = {
      strategy: 'jwt',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc'
    };

    const routeActivation = await canActivate(
      authenticationGuard(authentication)
    );

    expect(routeActivation).toEqual({
      hasError: false
    });
  });

  it('should get authentication error when authentication data is not provided', async () => {
    const authentication = undefined;

    const routeActivation = await canActivate(
      authenticationGuard(authentication)
    );

    expect(routeActivation).toEqual({
      error: new NotAuthenticated('User not authenticated'),
      hasError: true
    });
  });

  it('should not get forbidden access when the right user roles is not provided', async () => {
    const userAuthenticationRepository = userId => ({ 1234567890: { roles: [Role.AdminCoop] } }[userId]);
    const userId = '1234567890';
    const roles = [Role.Admin, Role.AdminCoop];

    const routeActivation = await canActivate(
      rolesGuard(userId, roles, userAuthenticationRepository)
    );

    expect(routeActivation).toEqual({
      hasError: false
    });
  });

  it('should get forbidden access error when the right user roles is not provided', async () => {
    const userAuthenticationRepository = userId => ({ 1234567890: { roles: [] } }[userId]);
    const userId = '1234567890';
    const roles = [Role.AdminCoop];

    const routeActivation = await canActivate(
      rolesGuard(userId, roles, userAuthenticationRepository)
    );

    expect(routeActivation).toEqual({
      error: new Forbidden('User not authorized', { userId }),
      hasError: true
    });
  });

  it('should get invalid schema error when the data do not pass schema validation', async () => {
    const schemaValidation = {
      value: {
        territoire: 'codeDepartement',
        nomOrdre: 'codeCodeDepartement',
        ordre: 1
      }
    };

    const routeActivation = await canActivate(
      schemaGuard(schemaValidation)
    );

    expect(routeActivation).toEqual({
      hasError: false
    });
  });

  it('should get invalid schema error when the data do not pass schema validation', async () => {
    const schemaValidation = {
      value: {
        territoire: 'codeDepartement',
        nomOrdre: 'codeCodeDepartement',
        ordre: 1
      },
      error: {
        _original: {
          territoire: 'codeDepartement',
          nomOrdre: 'codeCodeDepartement',
          ordre: '1',
          problem: true
        }
      }
    };

    const routeActivation = await canActivate(
      schemaGuard(schemaValidation)
    );

    expect(routeActivation).toEqual({
      error: new Unprocessable('Schema validation error', schemaValidation.error),
      hasError: true
    });
  });

  it('should get forbidden access error when the right user roles is not provided but all other activation functions are valid', async () => {
    const authentication = {
      strategy: 'jwt',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc'
    };

    const userAuthenticationRepository = userId => ({ 1234567890: { roles: [] } }[userId]);
    const userId = '1234567890';
    const roles = [Role.AdminCoop];

    const schemaValidation = {
      value: {
        territoire: 'codeDepartement',
        nomOrdre: 'codeCodeDepartement',
        ordre: 1
      }
    };

    const routeActivation = await canActivate(
      authenticationGuard(authentication),
      rolesGuard(userId, roles, userAuthenticationRepository),
      schemaGuard(schemaValidation)
    );

    expect(routeActivation).toEqual({
      error: new Forbidden('User not authorized', { userId }),
      hasError: true
    });
  });

  it('should activate route', async () => {
    const authentication = {
      strategy: 'jwt',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc'
    };

    let success = false;
    let error = false;

    activateRoute(await canActivate(
      authenticationGuard(authentication)
    ), () => {
      success = true;
    }, () => {
      error = true;
    });

    expect(success).toEqual(true);
    expect(error).toEqual(false);
  });

  it('should not activate route', async () => {
    const authentication = undefined;

    let success = false;
    let error = false;

    activateRoute(await canActivate(
      authenticationGuard(authentication)
    ), () => {
      success = true;
    }, () => {
      error = true;
    });

    expect(success).toEqual(false);
    expect(error).toEqual(true);
  });
});

