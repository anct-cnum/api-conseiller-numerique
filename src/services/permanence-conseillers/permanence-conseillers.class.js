const { Service } = require('feathers-mongodb');
const { Conflict, GeneralError } = require('@feathersjs/errors');
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
const { updatePermanenceToSchema, updatePermanencesToSchema } = require('./permanence/utils/update-permanence.utils');
const { getPermanenceByConseiller, getPermanencesByStructure, createPermanence, setPermanence, deletePermanence,
  deleteConseillerPermanence, updatePermanences } = require('./permanence/repositories/permanence-conseiller.repository');
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
          return res.send({ permanence });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('La recherche de permanence a échouée, veuillez réessayer.').toJSON());
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
          return res.send({ permanences });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(500).send(new GeneralError('La recherche de permanence a échoué, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.post('/permanences/conseiller/:id/create', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, req.params.id, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      const conseillerId = req.params.id;
      const { showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur } = req.body.permanence;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await createPermanence(db)(query, conseillerId, user._id, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur).then(() => {
          return res.send({ isCreated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La création de permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.patch('/permanences/conseiller/:id/update/:idPermanence', async (req, res) => {
      const db = await app.get('mongoClient');
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const query = updatePermanenceToSchema(req.body.permanence, req.params.id, database);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      const conseillerId = req.params.id;
      const permanenceId = req.params.idPermanence;
      const { showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur } = req.body.permanence;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await setPermanence(db)(permanenceId, query, conseillerId, user._id, showPermanenceForm, hasPermanence,
          telephonePro, emailPro, estCoordinateur).then(() => {
          return res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La mise à jour de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/permanences/verifySiret/:siret', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        try {
          const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${req.params.siret}`;
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

    app.get('/permanences/verifyAdresse/:adresse', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const adresse = JSON.parse(req.params.adresse);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {

        const adressePostale = encodeURI(`${adresse.numero} ${adresse.rue} ${adresse.ville} ${adresse.codePostal}`);
        const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adressePostale}`;

        try {
          const params = {};
          const result = await axios.get(urlAPI, { params: params });
          return res.send({ 'geocodeAdresse': result.data?.features });
        } catch (e) {
          return res.send({ 'geocodeAdresse': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.delete('/permanence/:id', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const idPermanence = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await deletePermanence(db)(idPermanence).then(() => {
          return res.send({ isDeleted: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La suppression de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.delete('/permanence/:id/conseiller', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const idPermanence = req.params.id;
      const idConseiller = user.entity.oid;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await deleteConseillerPermanence(db)(idPermanence, idConseiller).then(() => {
          return res.send({ isConseillerDeleted: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La suppression du conseiller de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.patch('/permanences/conseiller/:id/updateAll', async (req, res) => {
      const db = await app.get('mongoClient');
      const permanences = await updatePermanencesToSchema(req.body.permanences, req.params.id);
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await updatePermanences(db)(permanences).then(() => {
          return res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La mise à jour de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};

