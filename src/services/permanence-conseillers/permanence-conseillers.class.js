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
const { getPermanenceByConseiller, getPermanencesByStructure, createPermanence, setPermanence } =
  require('./permanence/repositories/permanence-conseiller.repository');
const axios = require('axios');

exports.PermanenceConseillers = class Sondages extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('permanences');
    });

    app.get('/permanences/conseiller/:id', async (req, res) => {

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

    app.get('/permanences/structure/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const structureId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getPermanencesByStructure(db)(structureId).then(permanences => {
          res.send({ permanences });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(404).send(new Conflict('La recherche de permanence a échoué, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.post('/permanences/conseiller/:id/create', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      const conseillerId = req.params.id;
      const hasPermanence = req.body.permanence.hasPermanence;
      const telephonePro = req.body.permanence.telephonePro;
      const emailPro = req.body.permanence.emailPro;
      const estCoordinateur = req.body.permanence.estCoordinateur;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await createPermanence(db)(query, conseillerId, hasPermanence, telephonePro, emailPro, estCoordinateur).then(() => {
          res.send({ isCreated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('La création de permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.patch('/permanences/conseiller/:id/update/:idPermanence', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      const conseillerId = req.params.id;
      const permanenceId = req.params.idPermanence;
      const hasPermanence = req.body.permanence.hasPermanence;
      const telephonePro = req.body.permanence.telephonePro;
      const emailPro = req.body.permanence.emailPro;
      const estCoordinateur = req.body.permanence.estCoordinateur;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await setPermanence(db)(permanenceId, query, conseillerId, hasPermanence, telephonePro, emailPro, estCoordinateur).then(() => {
          res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('La mise à jour de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.post('/permanences/verifySiret', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        try {
          const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${req.body.siret}`;
          const params = {
            token: app.get('api_entreprise'),
            context: 'cnum',
            recipient: 'cnum',
            object: 'checkSiret',
          };
          const result = await axios.get(urlSiret, { params: params });
          return res.send({ 'adresseParSiret': result.data.etablissement.adresse });
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          return res.send({ 'adresseParSiret': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));

    });
  }
};

