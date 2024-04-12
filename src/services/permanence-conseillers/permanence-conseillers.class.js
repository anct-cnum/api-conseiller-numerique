const { Service } = require('feathers-mongodb');
const { Conflict, GeneralError, BadRequest, NotFound } = require('@feathersjs/errors');
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
const {
  updatePermanenceToSchema,
  updatePermanencesToSchema,
  validationPermamences,
  locationDefault
} = require('./permanence/utils/update-permanence.utils');

const {
  getPermanenceById, getPermanencesByConseiller, getPermanencesByStructure,
  createPermanence, setPermanence, setReporterInsertion, deletePermanence,
  deleteConseillerPermanence, updatePermanences, updateConseillerStatut,
  getPermanences, deleteCraPermanence, deleteCraConseillerPermanence,
  checkPermanenceExistsBySiret, getAdressesCheckedByLocation,
  checkPermanenceExistsByLocation,
} = require('./permanence/repositories/permanence-conseiller.repository');

const axios = require('axios');
const { lieuxDeMediationNumerique } = require('./permanence/core/lieux-de-mediation-numerique.core');
const { getAdresseEtablissementBySiretEntrepriseApiV3 } = require('../../utils/entreprise.api.gouv');

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
        return res.status(404).send(new NotFound('La recherche des permanences a échoué, veuillez réessayer.').toJSON());
      });
    });

    app.get('/permanences/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      let permanence = {
        ...query
      };
      const conseillerId = req.params.id;
      let { hasPermanence, telephonePro, emailPro, idOldPermanence } = req.body.permanence;
      emailPro = emailPro?.trim();
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const error = await validationPermamences({ ...query, hasPermanence, telephonePro, emailPro });
        if (error) {
          logger.error(error);
          return res.status(400).send(new BadRequest(error).toJSON());
        }
        const existsPermanence = await checkPermanenceExistsByLocation(db)(permanence.location, permanence.adresse, permanence.structureId);
        if (existsPermanence) {
          return res.status(500).send(new GeneralError('La création de permanence est impossible : l\'adresse est déjà enregistrer en base.').toJSON());
        }
        await locationDefault(permanence);
        await createPermanence(db)(permanence, conseillerId, hasPermanence, telephonePro, emailPro).then(async idPermanence => {
          if (idOldPermanence) {
            return deleteConseillerPermanence(db)(idOldPermanence, conseillerId).then(async () => {
              return res.send({ isCreated: true, idPermanence, existsPermanence });
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(500).send(new GeneralError('La suppression du conseiller de la permanence a échoué, veuillez réessayer.').toJSON());
            });
          } else {
            return res.send({ isCreated: true, idPermanence, existsPermanence });
          }
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      let permanence = {
        ...query
      };
      const conseillerId = req.params.id;
      const permanenceId = req.params.idPermanence;
      let { hasPermanence, telephonePro, emailPro, idOldPermanence } = req.body.permanence;
      emailPro = emailPro?.trim();
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const error = await validationPermamences({ ...query, hasPermanence, telephonePro, emailPro });
        if (error) {
          logger.error(error);
          return res.status(400).send(new BadRequest(error).toJSON());
        }
        await locationDefault(permanence);
        await setPermanence(db)(permanenceId, permanence, conseillerId, hasPermanence,
          telephonePro, emailPro).then(() => {
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        try {
          const adresse = await getAdresseEtablissementBySiretEntrepriseApiV3(req.params.siret, app.get('api_entreprise'));
          if (adresse) {
            const repetitionVoie = adresse?.indice_repetition_voie ? adresse?.indice_repetition_voie?.toUpperCase() : '';
            const voie = adresse?.numero_voie + repetitionVoie;
            const adresseComplete = [
              voie ?? '',
              adresse?.type_voie ?? '',
              adresse?.libelle_voie ?? '',
              adresse?.code_postal ?? '',
              adresse?.libelle_commune ?? ''
            ].join(' ');
            let adresseParSiret = {
              l1: adresse?.acheminement_postal?.l1 ?? '',
              l2: adresse?.acheminement_postal?.l2 ?? '',
              numero_voie: voie ?? '',
              type_voie: adresse?.type_voie ?? '',
              libelle_voie: adresse?.libelle_voie ?? '',
              code_postal: adresse?.code_postal ?? '',
              libelle_commune: adresse?.libelle_commune ?? '',
              adresseComplete: adresseComplete,
            };

            try {
              const params = {};
              const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adresseComplete}`;
              const resultAPI = await axios.get(urlAPI, { params: params });
              if (resultAPI.data?.features?.length > 0) {
                adresseParSiret.listeAdresses = resultAPI.data?.features;
              }

              const existsPermanence = await checkPermanenceExistsBySiret(db)(req.params.siret);

              return res.send({ adresseParSiret, existsPermanence });
            } catch (error) {
              if (axios.isAxiosError(error)) {
                const status = error.response.status;
                const message = 'Une erreur est survenue lors de la recherche de l\'adresse par siret. Veuillez réessayer.';
                return res.status(status).send({ message });
              }
              logger.error(error);
              app.get('sentry').captureException(error);
              return res.send({ adresseParSiret });
            }
          }
        } catch (error) {
          // erreur 422 : Le numéro de siret n'est pas correctement formatté
          if (!error.response.data?.gateway_error && error.response.status !== 422) {
            logger.error(error);
            app.get('sentry').captureException(error);
          }
          return res.send({ 'adresseParSiret': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));

    });

    app.get('/permanences/verifyAdresse/:adresse', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      const adresse = JSON.parse(req.params.adresse);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {

        const adressePostale = encodeURI(`${adresse.numero} ${adresse.rue} ${adresse.codePostal} ${adresse.ville}`);
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

    app.get('/permanences/getAdresse/:adresse/:structureId', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      const { adresse } = JSON.parse(req.params.adresse);
      const structureId = req.params.structureId;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adresse}`;
        try {
          const params = {};
          const result = await axios.get(urlAPI, { params: params });
          let results = await getAdressesCheckedByLocation(db)(result.data?.features?.filter(adresse => adresse.properties.score > 0.7), structureId);
          return res.send({ ...results });
        } catch (e) {
          return res.send({ 'adresseApi': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.post('/permanences/reporter', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);

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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      const idPermanence = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await deletePermanence(db)(idPermanence).then(async () => {
          await deleteCraPermanence(db)(idPermanence).then(() => {
            return res.send({ isDeleted: true });
          }).catch(error => {
            app.get('sentry').captureException(error);
            logger.error(error);
            return res.status(409).send(new Conflict('La suppression de la permanence dans les cras existants a échoué, veuillez réessayer.').toJSON());
          });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(409).send(new Conflict('La suppression de la permanence a échoué, veuillez réessayer.').toJSON());
        });
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.delete('/permanence/:id/conseiller', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      const idPermanence = req.params.id;
      const idConseiller = user.entity.oid;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await deleteConseillerPermanence(db)(idPermanence, idConseiller).then(async () => {
          await deleteCraConseillerPermanence(db)(idPermanence, idConseiller).then(() => {
            return res.send({ isConseillerDeleted: true });
          }).catch(error => {
            app.get('sentry').captureException(error);
            logger.error(error);
            return res.status(409).send(new Conflict('La suppression de la permanence dans les cras existants a échoué, veuillez réessayer.').toJSON());
          });
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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);

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
      const userId = await userIdFromRequestJwt(app, req, res);
      const user = await userAuthenticationRepository(db)(userId);
      const conseillerId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await updateConseillerStatut(db)(conseillerId).then(() => {
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

