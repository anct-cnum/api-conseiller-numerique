const { Conflict, BadRequest, GeneralError, Forbidden, NotFound } = require('@feathersjs/errors');
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
  updateCra,
  updateStatistiquesCra,
  countCraByPermanenceId,
  deleteCra,
  deleteStatistiquesCra,
  searchSousThemes } = require('./cra/repositories/cra.repository');
const { updateCraToSchema } = require('./cra/utils/update-cra.utils');
const { validationCra } = require('./cra/utils/validationCra');
const { v4: validate } = require('uuid');

exports.Cras = class Cras extends Service {
  constructor(options, app) {
    super(options);

    const connection = app.get('mongodb');
    const database = connection.substr(connection.lastIndexOf('/') + 1);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('cras');
    });

    app.get('/cras/cra', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
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

    app.patch('/cras', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const oldDateAccompagnement = new Date(req.body.cra.oldDateAccompagnement);
      const cra = updateCraToSchema(req.body, database);
      const conseillerId = req.body.conseillerId;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const getCra = await getCraById(db)(cra._id);
        if (!getCra) {
          return res.status(404).send(new NotFound('Le cra que vous voulez modifier n\'existe pas.').toJSON());
        }
        if (JSON.stringify(getCra?.conseiller?.oid) !== JSON.stringify(user?.entity?.oid)) {
          return res.status(403).send(new Forbidden('Vous n\'avez pas l\'autorisation de modifier ce cra.').toJSON());
        }
        if (!validationCra(cra.cra)) {
          await updateCra(db)(cra).then(async () => {
            await updateStatistiquesCra(db)(cra, oldDateAccompagnement, conseillerId).then(() => {
              return res.send({ cra });
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(409).send(new Conflict('La mise à jour des statistiques associées au cra a échoué, veuillez réessayer.').toJSON());
            });
          }).catch(error => {
            app.get('sentry').captureException(error);
            logger.error(error);
            return res.status(409).send(new Conflict('La mise à jour du cra a échoué, veuillez réessayer.').toJSON());
          });
        } else {
          return res.status(400).send(new BadRequest(validationCra(cra)));
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.delete('/cras', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const craId = req.query.craId;
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user),
      ).then(async () => {
        await getCraById(db)(craId).then(async cra => {
          if (String(cra?.conseiller?.oid) === String(user.entity.oid)) {
            await deleteStatistiquesCra(db)(cra).then(async () => {
              return;
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(500).send(new GeneralError('La mise à jour du cra a échoué, veuillez réessayer.').toJSON());
            });
            await deleteCra(db)(craId, user.entity.oid, cra).then(() => {
              return res.send({ isDeleted: true });
            }).catch(error => {
              error.message = `${error.message} (conseillerId: ${user.entity.oid})`;
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(500).send(new GeneralError('Le cra n\'a pas pu être supprimé, veuillez réessayer plus tard.').toJSON());
            });
          } else {
            return res.status(403).send(new Forbidden('Vous n\'avez pas le droit de supprimer ce cra ou il a déjà été supprimé.').toJSON());
          }
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('Le cra que vous voulez supprimer n\'existe pas.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/cras/countByPermanence', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
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
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
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
