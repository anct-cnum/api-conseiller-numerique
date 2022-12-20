const { Conflict, BadRequest } = require('@feathersjs/errors');
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
const { getCraById, updateCra, updateStatistiquesCra, countCraByPermanenceId, deleteCra, deleteStatistiquesCra } = require('./cra/repositories/cra.repository');
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
        if (!validationCra(cra)) {
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
          if (cra.conseiller.$id === user.entity.$id) {
            await deleteStatistiquesCra(db)(cra).then(async () => {
              return;
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(409).send(new Conflict('La mise à jour du cra a échoué, veuillez réessayer.').toJSON());
            });
            /*
            await deleteCra(db)(craId).then(() => {
              res.send({ isDeleted: true });
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(404).send(new Conflict('Le cra n\'a pas pu être supprimé, veuillez réessayer plus tard.').toJSON());
            });
            */
          } else {
            return res.status(404).send(new Conflict('Vous ne pouvez pas supprimer ce cra.').toJSON());
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
  }
};
