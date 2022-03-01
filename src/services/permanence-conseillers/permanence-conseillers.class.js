const { Service } = require('feathers-mongodb');
const { Conflict } = require('@feathersjs/errors');
const logger = require('../../logger');

const {
  canActivate,
  authenticationGuard,
  authenticationFromRequest,
  rolesGuard,
  userIdFromRequestJwt,
  Role,
  abort
} = require('../../common/utils/feathers.utils');

const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const { updatePermanenceToSchema } = require('./permanence/utils/update-permanence.utils');
const { getPermanenceByConseiller, createPermanence, setPermanence } = require('./permanence/repositories/permanence-conseiller.repository');

exports.PermanenceConseillers = class Sondages extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('permanences');
    });

    app.get('/permanence-conseillers/conseiller/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const conseillerId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getPermanenceByConseiller(db)(conseillerId).then(permanence => {
          res.send({ permanence });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(404).send(new Conflict('La recherche de permanence a échouée, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.get('/permanence-conseillers/structure/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const structureId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getPermanencesByStructure(db)(structureId).then(permanence => {
          res.send({ permanence });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(404).send(new Conflict('La recherche de permanence a échouée, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.post('/permanence-conseillers/conseiller/:id/create', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const conseillerId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await createPermanence(db)(query, conseillerId).then(() => {
          res.send({ isCreated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('La création de permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.patch('/permanence-conseillers/:id', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const permanenceId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await setPermanence(db)(permanenceId, query).then(() => {
          res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('La mise à jour de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};

