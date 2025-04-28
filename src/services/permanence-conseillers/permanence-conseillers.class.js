const { Service } = require('feathers-mongodb');
const { Conflict, GeneralError, NotFound } = require('@feathersjs/errors');
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
  getPermanenceById, getPermanencesByConseiller, getPermanencesByStructure,
  checkPermanenceExistsBySiret, getAdressesCheckedByLocation,
} = require('./permanence/repositories/permanence-conseiller.repository');

const axios = require('axios');
const { getAdresseEtablissementBySiretEntrepriseApiV3 } = require('../../utils/entreprise.api.gouv');
const { ObjectId } = require('mongodb');

exports.PermanenceConseillers = class Sondages extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('permanences');
    });

    app.get('/lieux-mediation-numerique', async (req, res) => {
      const urlAPI = app.get('api_lieux_activite_coop_numerique');
      try {
        const lieux = await axios.get(urlAPI, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + app.get('token_coop_numerique')
          },
          params: { 'filter[dispositif_programmes_nationaux]': 'Conseillers numériques' }
        });
        res.send(lieux.data);
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
        return res.status(404).send(new NotFound('La recherche des permanences a échoué, veuillez réessayer.').toJSON());
      }
    });

    app.get('/permanences/:id', async (req, res) => {

      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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

    app.get('/permanences/verifySiret/:siret', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
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
  }
};

