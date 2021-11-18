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

const userHasAtLeastOneAuthorizedRole = async (userAuthenticationRepository, userId, authorizedRoles) =>
  (await userAuthenticationRepository(userId))?.roles.some(role => authorizedRoles.includes(role));

const noError = () => ({ hasError: false });

const authenticationGuard = authentication => () =>
  authentication !== undefined ?
    noError() :
    { error: new NotAuthenticated('User not authenticated'), hasError: true };

const rolesGuard = (userId, roles, userAuthenticationRepository) => async () =>
  await userHasAtLeastOneAuthorizedRole(userAuthenticationRepository, userId, roles) ?
    noError() :
    { error: new Forbidden('User not authorized', { userId }), hasError: true };

const schemaGuard = schemaValidation => () =>
  schemaValidation.error === undefined ?
    noError() :
    { error: new Unprocessable('Schema validation error', schemaValidation.error), hasError: true };

const firstError = activationChecksResults => activationChecksResults.find(result => result.hasError);

const runAllActivationChecks = async activationChecks => await Promise.all(activationChecks.map(async activationCheck => await activationCheck()));

const canActivate = async (...activationChecks) => firstError(await runAllActivationChecks(activationChecks)) ?? noError();

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
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  canActivate,
  activateRoute
};
