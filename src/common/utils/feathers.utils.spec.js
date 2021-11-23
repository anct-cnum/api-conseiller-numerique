const { Forbidden, NotAuthenticated, Unprocessable } = require('@feathersjs/errors');
const {
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  canActivate,
  Role,
  authenticationFromRequest,
  userIdFromRequestJwt,
  abort,
  csvFileResponse
} = require('./feathers.utils');

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
    const res = new Response();

    abort(res, new NotAuthenticated('User not authenticated'));

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

    await expect((async () => {
      await canActivate(
        authenticationGuard(authentication)
      );
    })()).resolves.toBeUndefined();
  });

  it('should get authentication error when authentication data is not provided', async () => {
    const authentication = undefined;

    await expect((async () => {
      await canActivate(
        authenticationGuard(authentication)
      );
    })()).rejects.toThrowError(new NotAuthenticated('User not authenticated'));
  });

  it('should not get forbidden error when the right user roles are provided', async () => {
    const userAuthenticationRepository = userId => ({ 1234567890: { roles: [Role.AdminCoop] } }[userId]);
    const userId = '1234567890';
    const roles = [Role.Admin, Role.AdminCoop];

    await expect((async () => {
      await canActivate(
        rolesGuard(userId, roles, userAuthenticationRepository)
      );
    })()).resolves.toBeUndefined();
  });

  it('should get forbidden error when the right user roles are not provided', async () => {
    const userAuthenticationRepository = userId => ({ 1234567890: { roles: [] } }[userId]);
    const userId = '1234567890';
    const roles = [Role.AdminCoop];

    await expect((async () => {
      await canActivate(
        rolesGuard(userId, roles, userAuthenticationRepository)
      );
    })()).rejects.toThrowError(new Forbidden('User not authorized', { userId }));
  });

  it('should not get invalid schema error when inputs pass schema validation', async () => {
    const schemaValidation = {
      value: {
        territoire: 'codeDepartement',
        nomOrdre: 'codeCodeDepartement',
        ordre: 1
      }
    };

    await expect((async () => {
      await canActivate(
        schemaGuard(schemaValidation)
      );
    })()).resolves.toBeUndefined();
  });

  it('should get invalid schema error when inputs do not pass schema validation', async () => {
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

    await expect((async () => {
      await canActivate(
        schemaGuard(schemaValidation)
      );
    })()).rejects.toThrowError(new Unprocessable('Schema validation error', schemaValidation.error));
  });

  it('should get forbidden error when the right user roles are not provided but all other activation functions are valid', async () => {
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

    await expect((async () => {
      await canActivate(
        authenticationGuard(authentication),
        rolesGuard(userId, roles, userAuthenticationRepository),
        schemaGuard(schemaValidation)
      );
    })()).rejects.toThrowError(new Forbidden('User not authorized', { userId }));
  });
});
