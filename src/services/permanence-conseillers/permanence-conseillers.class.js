const { Service } = require('feathers-mongodb');
const { Conflict, GeneralError, BadRequest } = require('@feathersjs/errors');
const logger = require('../../logger');
const { ObjectId } = require('mongodb');

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
const { getPermanenceById, getPermanencesByConseiller, getPermanencesByStructure, createPermanence, setPermanence, setReporterInsertion, deletePermanence,
  deleteConseillerPermanence, updatePermanences, updateConseillerStatut, getPermanences, deleteCraPermanence,
} = require('./permanence/repositories/permanence-conseiller.repository');

const axios = require('axios');
const { lieuxDeMediationNumerique } = require('./permanence/core/lieux-de-mediation-numerique.core');
const {
  createAdresseIntrouvable,
  sendEmailAdresseIntrouvable,
  deleteAdresseIntrouvable,
  getAdresseIntrouvable
} = require('./permanence/repositories/adresses-introuvables.repository');

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
      const adresseIntrouvable = req.body.permanence?.adresseIntrouvable ?? null;
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      let permanence = {
        ...query
      };
      const conseillerId = req.params.id;
      const { hasPermanence, telephonePro, emailPro, estCoordinateur, idOldPermanence } = req.body.permanence;
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const error = await validationPermamences({ ...query, hasPermanence, telephonePro, emailPro, estCoordinateur });
        if (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(400).send(new BadRequest(error).toJSON());
        }
        await locationDefault(permanence);
        await createPermanence(db)(permanence, conseillerId, hasPermanence, telephonePro, emailPro, estCoordinateur).then(async permanenceId => {
          if (idOldPermanence) {
            return deleteConseillerPermanence(db)(idOldPermanence, conseillerId).then(async () => {
              return res.send({ isCreated: true });
            }).catch(error => {
              app.get('sentry').captureException(error);
              logger.error(error);
              return res.status(409).send(new Conflict('La suppression du conseiller de la permanence a échoué, veuillez réessayer.').toJSON());
            });
          } else {
            let sendMailAdresseIntrouvable = false;
            //envoi mail pour prévenir de l'absence d'une adresse
            if (adresseIntrouvable) {
              createAdresseIntrouvable(db)(user, adresseIntrouvable, permanenceId).then(async () => {
                sendMailAdresseIntrouvable = await sendEmailAdresseIntrouvable(app, db, user, adresseIntrouvable, permanenceId);
              });
            }
            return res.send({ isCreated: true, sendMailAdresseIntrouvable });
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
      const adresseIntrouvable = req.body.permanence?.adresseIntrouvable ?? null;
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      let permanence = {
        ...query
      };
      const conseillerId = req.params.id;
      const permanenceId = req.params.idPermanence;
      const { hasPermanence, telephonePro, emailPro, estCoordinateur, idOldPermanence } = req.body.permanence;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const error = await validationPermamences({ ...query, hasPermanence, telephonePro, emailPro, estCoordinateur });
        if (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(400).send(new BadRequest(error).toJSON());
        }
        await locationDefault(permanence);
        await setPermanence(db)(permanenceId, permanence, conseillerId, hasPermanence,
          telephonePro, emailPro, estCoordinateur).then(() => {
          if (!adresseIntrouvable) {
            deleteAdresseIntrouvable(db)(permanenceId);
          } else if (adresseIntrouvable) {
            createAdresseIntrouvable(db)(user, adresseIntrouvable, new ObjectId(permanenceId)).then(async () => {
              await sendEmailAdresseIntrouvable(app, db, user, adresseIntrouvable, new ObjectId(permanenceId));
            });
          }
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
          let adresse = result?.data?.etablissement?.adresse;
          if (adresse) {
            const adresseComplete = [
              adresse?.numero_voie ?? '',
              adresse?.type_voie ?? '',
              adresse?.nom_voie ?? '',
              adresse?.code_postal ?? '',
              adresse?.localite ?? ''
            ].join(' ');
            let adresseParSiret = {
              l1: adresse?.l1 ?? '',
              l2: adresse?.l2 ?? '',
              numero_voie: adresse?.numero_voie ?? '',
              type_voie: adresse?.type_voie ?? '',
              nom_voie: adresse?.nom_voie ?? '',
              code_postal: adresse?.code_postal ?? '',
              localite: adresse?.localite ?? '',
              adresseComplete: adresseComplete,
            };

            try {
              const params = {};
              const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adresseComplete}`;
              const resultAPI = await axios.get(urlAPI, { params: params });
              if (resultAPI.data?.features?.length > 0) {
                adresseParSiret.listeAdresses = resultAPI.data?.features;
              }
              return res.send({ adresseParSiret });
            } catch (error) {
              logger.error(error);
              app.get('sentry').captureException(error);
              return res.send({ adresseParSiret });
            }
          }
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

    app.get('/permanences/getAdresse/:adresse', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const { adresse } = JSON.parse(req.params.adresse);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user?._id, [Role.Conseiller], () => user)
      ).then(async () => {
        const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adresse}`;
        try {
          const params = {};
          const result = await axios.get(urlAPI, { params: params });
          return res.send({ 'adresseApi': result.data?.features });
        } catch (e) {
          return res.send({ 'adresseApi': null });
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/permanences/getAdresseIntrouvable/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const permanenceId = req.params.id;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await getAdresseIntrouvable(db)(permanenceId).then(adresseIntrouvable => {
          return res.send({ adresseIntrouvable });
        }).catch(error => {
          app.get('sentry').captureException(error);
          logger.error(error);
          return res.status(404).send(new Conflict('La recherche de permanence a échouée, veuillez réessayer.').toJSON());
        });
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
        await deletePermanence(db)(idPermanence).then(async () => {
          await deleteAdresseIntrouvable(db)(idPermanence);
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
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const idPermanence = req.params.id;
      const idConseiller = user.entity.oid;

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(user._id, [Role.Conseiller], () => user)
      ).then(async () => {
        await deleteConseillerPermanence(db)(idPermanence, idConseiller).then(async () => {
          await deleteCraPermanence(db)(idPermanence).then(() => {
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

