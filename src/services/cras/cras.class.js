const { Conflict, GeneralError, Forbidden, NotFound } = require('@feathersjs/errors');
const logger = require('../../logger');
const { Service } = require('feathers-mongodb');
const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const {
  userIdFromRequestJwt,
  abort, canActivate,
  authenticationGuard,
  authenticationFromRequest,
  rolesGuard,
  Role,
} = require('../../common/utils/feathers.utils');
const {
  getCraById,
  countCraByPermanenceId,
  searchSousThemes } = require('./cra/repositories/cra.repository');
const { v4: validate } = require('uuid');
const { ObjectId } = require('mongodb');

exports.Cras = class Cras extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('cras');
    });

    app.get('/cras/cra', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      const user = await userAuthenticationRepository(db)(userId);
      const craId = req.query.id;
      if (!validate(craId)) {
        return res.status(404).send(new Conflict('L\'id du cra est invalide.').toJSON());
      }
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getCraById(db)(craId).then(cra => {
          if (cra === null) {
            return res.status(404).send(new NotFound('Le cra n\'a pas pu être chargé ou a été supprimé.').toJSON());
          }
          if (JSON.stringify(cra.conseiller.oid) !== JSON.stringify(user.entity.oid)) {
            return res.status(403).send(new Forbidden('Vous n\'avez pas l\'autorisation de modifier ce cra.').toJSON());
          }
          return res.send({ cra });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('Le cra n\'a pas pu être chargé.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/cras/countByPermanence', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      const user = await userAuthenticationRepository(db)(userId);
      const permanenceId = req.query.permanenceId;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await countCraByPermanenceId(db)(permanenceId).then(count => {
          return res.send({ id: permanenceId, count: count });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('Le comptage de cras pour cette permanence a échoué.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/cras/searchSousThemes', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      const user = await userAuthenticationRepository(db)(userId);
      const { sousTheme } = req.query;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await searchSousThemes(db)(sousTheme).then(sousThemes => {
          return res.send({ sousThemes });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(500).send(new GeneralError('Une erreur s\'est produite lors de la recherche de sous-thèmes.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};
