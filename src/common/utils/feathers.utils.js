const { Forbidden, NotAuthenticated, Unprocessable, NotFound } = require('@feathersjs/errors');

const Role = {
  Admin: 'admin',
  AdminCoop: 'admin_coop',
  StructureCoop: 'structure_coop',
  HubCoop: 'hub_coop',
  Coordinateur: 'coordinateur_coop',
  Conseiller: 'conseiller',
  Candidat: 'candidat',
  Prefet: 'prefet',
};

const checkAuth = (req, res, next) => {
  if (req.feathers?.authentication === undefined) {
    res.status(401).send(new NotAuthenticated('User not authenticated'));
    return;
  }
  next();
};

const authenticationFromRequest = req => req.feathers?.authentication ?? {};

const userIdFromRequestJwt = async (app, req) => {
  try {
    const decode = await app.service('authentication').verifyAccessToken(req.feathers.authentication?.accessToken);
    return decode.sub;
  } catch (error) {
    return null;
  }
};

const idSubordonne = req => req.query?.idSubordonne === 'null' ? null : req.query?.idSubordonne;

const abort = (res, error) => res.status(error.code).send(error.toJSON());

const csvFileResponse = (res, fileName, fileContent) => {
  res.setHeader('Content-disposition', `attachment; filename=${fileName}`)
  .set('Content-Type', 'text/csv')
  .status(200)
  .send(fileContent);
};

const authenticationGuard = async authentication =>
  authentication !== undefined ?
    await Promise.resolve() :
    await Promise.reject(new NotAuthenticated('User not authenticated'));

const userHasAtLeastOneAuthorizedRole = async (userAuthenticationRepository, userId, authorizedRoles) =>
  (await userAuthenticationRepository(userId))?.roles.some(role => authorizedRoles.includes(role));

const rolesGuard = async (userId, roles, userAuthenticationRepository) =>
  await userHasAtLeastOneAuthorizedRole(userAuthenticationRepository, userId, roles) ?
    Promise.resolve(userId) :
    Promise.reject(new Forbidden('User not authorized', { userId }));

const schemaGuard = async schemaValidation =>
  schemaValidation.error === undefined ?
    await Promise.resolve() :
    await Promise.reject(new Unprocessable('Schema validation error', schemaValidation.error));

const existGuard = async ressource =>
  ressource !== null && ressource !== undefined ?
    await Promise.resolve() :
    await Promise.reject(new NotFound('This ressource does not exist'));

const canActivate = (...activationChecks) => Promise.all(activationChecks);

module.exports = {
  Role,
  checkAuth,
  authenticationFromRequest,
  userIdFromRequestJwt,
  idSubordonne,
  abort,
  csvFileResponse,
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  existGuard,
  canActivate
};
