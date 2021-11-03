const { Forbidden, NotAuthenticated, Unprocessable } = require('@feathersjs/errors');
const decode = require('jwt-decode');

const Role = {
  Admin: 'admin',
  AdminCoop: 'admin_coop'
};

const authenticationFromRequest = req => req.feathers?.authentication ?? {};

const userIdFromRequestJwt = req => decode(req.feathers.authentication.accessToken).sub;

const abort = (res, routeActivation) => res.status(routeActivation.error.code).send(routeActivation.error.toJSON());

const csvFileResponse = (res, fileName, fileContent) => {
  res.setHeader('Content-disposition', `attachment; filename=${fileName}`)
  .set('Content-Type', 'text/csv')
  .status(200)
  .send(fileContent);
};

const isAuthenticated = authentication => () => {
  if (authentication !== undefined) {
    return {
      hasError: false
    };
  }

  return {
    error: new NotAuthenticated('User not authenticated'),
    hasError: true
  };
};

const hasRoles = (userId, roles, userAuthenticationRepository) => async () => {
  const user = await userAuthenticationRepository(userId);

  if (user?.roles.some(role => roles.includes(role))) {
    return {
      hasError: false
    };
  }

  return {
    error: new Forbidden('User not authorized', { userId }),
    hasError: true
  };
};

const hasValidSchema = schemaValidation => async () => {
  if (schemaValidation.error === undefined) {
    return {
      hasError: false
    };
  }

  return {
    error: new Unprocessable('Schema validation error', schemaValidation.error),
    hasError: true
  };
};

const canActivate = async (...activationChecks) => (
  await Promise.all(
    activationChecks.map(async activationCheck => await activationCheck())
  )).find(result => result.hasError) ?? { hasError: false };

const activateRoute = (routeActivation, onActivate, onAbort) => {
  if (routeActivation.hasError) {
    onAbort(routeActivation.error);
    return;
  }

  onActivate();
};

module.exports = {
  Role,
  authenticationFromRequest,
  userIdFromRequestJwt,
  abort,
  csvFileResponse,
  isAuthenticated,
  hasRoles,
  hasValidSchema,
  canActivate,
  activateRoute
};

