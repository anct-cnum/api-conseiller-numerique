const { Service } = require('feathers-mongodb');
const { Conflict, GeneralError, BadRequest } = require('@feathersjs/errors');
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
const { updatePermanenceToSchema, updatePermanencesToSchema, validationPermamences } = require('./permanence/utils/update-permanence.utils');
const { getPermanenceById, getPermanencesByConseiller, getPermanencesByStructure, createPermanence, setPermanence, setReporterInsertion, deletePermanence,
  deleteConseillerPermanence, updatePermanences, updateConseillerStatut, getPermanences
} = require('./permanence/repositories/permanence-conseiller.repository');

const axios = require('axios');
const { lieuxDeMediationNumerique } = require('./permanence/core/lieux-de-mediation-numerique.core');

exports.PermanenceConseillers = class Sondages extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('permanences');
    });

    app.get('/permanences/', async (req, res) => {
      const db = await app.get('mongoClient');

      await lieuxDeMediationNumerique({
        getPermanences: getPermanences(db)
      }).then(lieux => res.send(lieux)).catch(error => {
        app.get('sentry').captureException(error);
        logger.error(error);
      });
    });

    app.get('/permanences/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const permanenceId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getPermanenceById(db)(permanenceId).then(permanence => {
          return res.send({ permanence });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('La recherche de permanence a échouée, veuillez réessayer.').toJSON());
        });

      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.get('/permanences/conseiller/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const conseillerId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getPermanencesByConseiller(db)(conseillerId).then(permanences => {
          return res.send({ permanences });
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
      const { showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur, idOldPermanence } = req.body.permanence;
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user),
      ).then(async () => {
        await validationPermamences({ ...query, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur }).then(error => {
          if (error) {
            app.get('sentry').captureException(error);
            logger.error(error);
            return res.status(409).send(new BadRequest(error).toJSON());
          }
          return createPermanence(db)(query, conseillerId, user._id, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur).then(() => {
            if (idOldPermanence) {
              // eslint-disable-next-line max-nested-callbacks
              return deleteConseillerPermanence(db)(idOldPermanence, conseillerId).then(() => {
                return res.send({ isCreated: true });
              // eslint-disable-next-line max-nested-callbacks
              }).catch(error => {
                app.get('sentry').captureException(error);
                logger.error(error);
                return res.status(409).send(new Conflict('La suppression du conseiller de la permanence a échoué, veuillez réessayer.').toJSON());
              });
            } else {
              return res.send({ isCreated: true });
            }
          });
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
      const { showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur, idOldPermanence } = req.body.permanence;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await setPermanence(db)(permanenceId, query, conseillerId, user._id, showPermanenceForm, hasPermanence,
          telephonePro, emailPro, estCoordinateur).then(() => {

          if (idOldPermanence) {
            deleteConseillerPermanence(db)(idOldPermanence, conseillerId).then(() => {
              return res.send({ isUpdated: true });
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(409).send(new Conflict('La suppression du conseiller de la permanence a échoué, veuillez réessayer.').toJSON());
            });
          } else {
            return res.send({ isUpdated: true });
          }
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
          return res.send({ 'adresseParSiret': result?.data?.etablissement?.adresse });
        } catch (error) {
          if (!error.response.data?.gateway_error) {
            logger.error(error);
            app.get('sentry').captureException(error);
          }
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

    app.post('/permanences/reporter', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await setReporterInsertion(db)(user._id).then(() => {
          return res.send({ isReporter: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('Une erreur est survenue au moment du report du formulaire, veuillez réessayer.').toJSON());
        });
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

    app.patch('/permanences/conseiller/:id/statut', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const conseillerId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await updateConseillerStatut(db)(user._id, conseillerId).then(() => {
          return res.send({ isUpdated: true });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La mise à jour des statuts du conseillers a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};

