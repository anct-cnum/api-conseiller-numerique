const { Service } = require('feathers-mongodb');
const decode = require('jwt-decode');
const { Forbidden, NotAuthenticated, BadRequest, GeneralError } = require('@feathersjs/errors');
const { ObjectID } = require('mongodb');
const statsCras = require('./cras');
const Joi = require('joi');
const dayjs = require('dayjs');
const axios = require('axios');
const logger = require('../../logger');
const statsPdf = require('./stats.pdf');
const statsFct = require('./stats.function');
const {
  canActivate,
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  authenticationFromRequest,
  userIdFromRequestJwt,
  abort,
  csvFileResponse,
  Role
} = require('../../common/utils/feathers.utils');
const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName
} = require('./export-statistiques/utils/export-statistiques.utils');
const { buildExportStatistiquesCsvFileContent } = require('../../common/document-templates/statistiques-accompagnement-csv/statistiques-accompagnement-csv');
const { getStatistiquesToExport } = require('./export-statistiques/core/export-statistiques.core');
const { exportStatistiquesRepository } = require('./export-statistiques/repositories/export-statistiques.repository');
const { statsRepository } = require('./stats.repository');
const departementsRegion = require('../../../data/imports/departements-region.json');

exports.Stats = class Stats extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('stats');
    });

    app.get('/stats/conseillers/finalisees', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!['structure'].includes(user?.roles[0])) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }
        const conseillers = await db.collection('misesEnRelation').countDocuments({ statut: 'finalisee' });
        res.send({ conseillerTotalFinalisee: conseillers });
      });
    });

    app.get('/stats/metabase', async (req, res) => {
      let stats = {};
      const metabasePublicUrl = app.get('metabase_public_url');

      const cards = [
        {
          name: 'nbStructures',
          path: '/card/142'
        },
        {
          name: 'nbAccompagnements',
          path: '/card/116'
        },
      ];

      for (const card of cards) {
        try {
          const result = await axios({
            method: 'get',
            url: `${metabasePublicUrl}${card.path}`,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          stats[card.name] = result?.data?.data?.rows;
        } catch (e) {
          logger.error(e);
          return false;
        }
      }

      stats['nbStructures'] = stats['nbStructures'][0][0] + stats['nbStructures'][1][0];
      stats['nbAccompagnements'] = stats['nbAccompagnements'][0][0];

      res.send(stats);
    });

    app.get('/stats/dashboard', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //verify user role admin
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: adminUser
          }).toJSON());
          return;
        }

        let stats = {};
        stats.structuresCount = await db.collection('structures').countDocuments();
        stats.conseillersCount = await db.collection('conseillers').countDocuments();
        stats.matchingsCount = await db.collection('misesEnRelation').estimatedDocumentCount();
        stats.structuresEnAttenteCount = await db.collection('structures').countDocuments({ 'userCreated': false });
        stats.structuresValideesCount = await db.collection('structures').countDocuments({ 'statut': 'VALIDATION_COSELEC' });
        stats.structuresActiveesCount = await db.collection('structures').countDocuments({ 'userCreated': true });
        stats.structuresQuiRecrutentCount = await db.collection('misesEnRelation').aggregate(
          [
            { $match: { $or: [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }] } },
            { $group: { _id: '$structureObj._id' } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ]).toArray();
        stats.structuresQuiRecrutentCount = stats.structuresQuiRecrutentCount.length > 0 ? stats.structuresQuiRecrutentCount[0].count : 0;
        stats.conseillersRecrutesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'recrutee' });
        stats.conseillersRecrutesFinalisesCount = await db.collection('misesEnRelation').countDocuments({ statut: 'finalisee' });
        res.send(stats);
      });
    });

    //Statistiques CRA du conseiller
    app.get('/stats/cra', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (!statsFct.checkAuth(req)) {
          res.status(401).send(new NotAuthenticated('Utilisateur non autorisé'));
          return;
        }

        //Verification role conseiller
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const conseillerUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        const rolesAllowed = [Role.Conseiller, Role.AdminCoop, Role.StructureCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => conseillerUser?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Verification du conseiller associé à l'utilisateur correspondant
        const id = [Role.AdminCoop, Role.StructureCoop, Role.Coordinateur].filter(role => conseillerUser?.roles.includes(role)).length > 0 ?
          req.query.idConseiller : conseillerUser.entity.oid;

        const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(id) });

        if (conseiller?._id.toString() !== req.query?.idConseiller.toString()) {
          res.status(403).send(new Forbidden('User not authorized', {
            conseillerId: req.query.idConseiller
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);

        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        let query = {
          'conseiller.$id': new ObjectID(conseiller._id),
          'cra.dateAccompagnement': {
            $gte: dateDebut,
            $lt: dateFin,
          }
        };

        if (req.query?.codePostal !== '' && req.query?.codePostal !== 'null') {
          query = {
            'conseiller.$id': new ObjectID(conseiller._id),
            'cra.codePostal': req.query?.codePostal,
            'cra.dateAccompagnement': {
              $gte: dateDebut,
              $lt: dateFin,
            }
          };
        }

        //Construction des statistiques
        const stats = await statsCras.getStatsGlobales(db, query, statsCras, statsFct.checkRole(conseillerUser.roles, Role.AdminCoop));

        res.send(stats);
      });
    });

    app.get('/stats/cra/codesPostaux/conseiller/:id', async (req, res) => {
      if (!statsFct.checkAuth(req)) {
        res.status(401).send(new NotAuthenticated('Utilisateur non autorisé'));
        return;
      }
      const userId = decode(req.feathers.authentication.accessToken).sub;
      const idConseiller = new ObjectID(req.params.id);

      app.get('mongoClient').then(async db => {
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!statsFct.checkRole(user?.roles, 'conseiller')) {
          res.status(403).send(new Forbidden('Utilisateur non autorisé', {
            userId: userId
          }).toJSON());
          return;
        }

        try {
          const listCodePostaux = await statsFct.getCodesPostauxCras(idConseiller, statsRepository(db));
          res.send(listCodePostaux);
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('Une erreur est survenue lors de la génération de la liste des codes postaux.').toJSON());
          return;
        }
      });
    });

    app.get('/stats/cra/codesPostaux/structure/:id', async (req, res) => {

      if (!statsFct.checkAuth(req)) {
        res.status(401).send(new NotAuthenticated('Utilisateur non authentifié'));
        return;
      }
      const userId = decode(req.feathers.authentication.accessToken).sub;
      const idStructureParams = new ObjectID(req.params.id);

      app.get('mongoClient').then(async db => {
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!user?.roles.includes('prefet') && !user?.roles.includes('admin')) {
          const structureIdByUser = user.entity.oid;
          if (!user?.roles.includes('structure_coop') && structureIdByUser !== idStructureParams) {
            res.status(403).send(new Forbidden('Utilisateur non autorisé', {
              userId: userId
            }).toJSON());
            return;
          }
        }

        const conseillerIds = await statsFct.getConseillersIdsByStructure(idStructureParams, res, statsRepository(db));

        try {
          const listCodePostaux = await statsFct.getCodesPostauxCrasStructure(conseillerIds, statsRepository(db));
          return res.send(listCodePostaux);
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('Une erreur est survenue lors de la génération de la liste des codes postaux.').toJSON());
          return;
        }
      });
    });

    app.get('/stats/admincoop/statistiques.pdf', async (req, res) => {
      app.get('mongoClient').then(async db => {
        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        try {
          let userId = decode(accessToken).sub;
          let userFinal = {};
          const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
          const rolesAllowed = [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Prefet, Role.Coordinateur];
          if (rolesAllowed.filter(role => user?.roles.includes(role)).length === 0) {
            res.status(403).send(new Forbidden('User not authorized', {
              userId: userId
            }).toJSON());
            return;
          }

          if (user.roles.includes(Role.Prefet)) {
            userFinal = await db.collection('users').findOne({ 'entity.$ref': 'structures', 'entity.$id': new ObjectID(req.query?.idType) });
          } else {
            userFinal = user;
          }

          let codePostal = '/null';
          const dateDebut = dayjs(req.query.dateDebut).format('YYYY-MM-DD');
          const dateFin = dayjs(req.query.dateFin).format('YYYY-MM-DD');
          let idType = '';
          const type = req.query.type;
          if (type === 'structure') {
            idType = userFinal?.entity?.oid + '/';
            if (req.query.codePostal) {
              codePostal = '/' + req.query.codePostal;
            }
          } else {
            idType = req.query.idType === 'undefined' ? '' : req.query.idType + '/';
            codePostal = idType === '' ? '' : '/null';
          }
          const schema = Joi.object({
            dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
            dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
            type: Joi.string().required().error(new Error('Le type de territoire est invalide')),
            idType: Joi.required().error(new Error('L\'id du territoire invalide')),
            codePostal: Joi.string().allow(null, '').error(new Error('Le code postal est invalide')),
          }).validate(req.query);

          if (schema.error) {
            res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
            return;
          }

          let finUrl = '/' + type + '/' + idType + dateDebut + '/' + dateFin + codePostal;
          /** Ouverture d'un navigateur en headless afin de générer le PDF **/
          try {
            await statsPdf.generatePdf(app, res, logger, accessToken, userFinal, finUrl);
            return;
          } catch (error) {
            app.get('sentry').captureException(error);
            logger.error(error);
            res.status(500).send(new GeneralError('Une erreur est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
            return;
          }
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(500).send(new GeneralError('Une erreur d\'authentification est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
          return;
        }
      });
    });

    app.get('/stats/admincoop/statistiques.csv', async (req, res) => {
      const db = await app.get('mongoClient');
      const query = exportStatistiquesQueryToSchema(req.query);

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userIdFromRequestJwt(req), [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Prefet, Role.Coordinateur],
          userAuthenticationRepository(db)),
        schemaGuard(validateExportStatistiquesSchema(query))
      ).then(async () => {
        let ids = [];
        let userFinal = {};
        const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));

        if (user.roles.includes(Role.Prefet)) {
          userFinal = await db.collection('users').findOne({ 'entity.$ref': 'structures', 'entity.$id': new ObjectID(req.query?.idType) });
        } else {
          userFinal = user;
        }

        if (query.type !== 'structure') {
          ids = query.conseillerIds !== undefined ? query.conseillerIds.split(',').map(id => new ObjectID(id)) : query.conseillerIds;
        } else {
          const getUserById = userAuthenticationRepository(db);
          const { getStructureAssociatedWithUser } = exportStatistiquesRepository(db);

          const structure = await getStructureAssociatedWithUser(await getUserById(userFinal._id));
          const structureId = structure._id;
          ids = await statsFct.getConseillersIdsByStructure(structureId, res, statsRepository(db));
        }
        const { stats, type, idType } = await getStatistiquesToExport(
          query.dateDebut, query.dateFin, query.idType, query.type, query.codePostal, ids,
          exportStatistiquesRepository(db),
          statsFct.checkRole(userFinal?.roles, Role.AdminCoop)
        );
        csvFileResponse(res,
          `${getExportStatistiquesFileName(query.dateDebut, query.dateFin, type, idType, query.codePostal)}.csv`,
          // eslint-disable-next-line max-len
          buildExportStatistiquesCsvFileContent(stats, query.dateDebut, query.dateFin, type, idType, query.codePostal, statsFct.checkRole(userFinal?.roles, Role.AdminCoop))
        );
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/stats/admincoop/dashboard', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role admin_coop
      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!adminUser?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Construction des statistiques
        let stats = {};

        //Total cras
        stats.nbCras = await db.collection('cras').estimatedDocumentCount();
        //Total accompagnement
        let nbAccompagnements = await db.collection('cras').aggregate(
          { $group:
            { _id: null, count: { $sum: '$cra.nbParticipants' } }
          },
          { $project: { 'valeur': '$count' } }
        ).toArray();
        stats.totalAccompagnements = nbAccompagnements[0].count;

        //Conseillers enregistrés
        stats.conseillersEnregistres = await db.collection('users').countDocuments({
          'roles': { $in: ['conseiller'] },
          'passwordCreated': true
        });

        const conseillersNonEnregistres = await db.collection('users').countDocuments({
          'roles': { $in: ['conseiller'] },
          'passwordCreated': false
        });

        stats.invitationsEnvoyees = conseillersNonEnregistres + stats.conseillersEnregistres;
        stats.tauxActivationComptes = stats.invitationsEnvoyees > 0 ? Math.round(stats.conseillersEnregistres * 100 / stats.invitationsEnvoyees) : 0;

        //Utilise Pix Orga
        stats.utilisePixOrga = await db.collection('conseiller').countDocuments({
          'statut': 'RECRUTE'
          //PixOrga ?
        });

        //Utilise rdv solidarité
        stats.utiliseRdvSolidarites = await db.collection('conseiller').countDocuments({
          'statut': 'RECRUTE'
          //Rdv solidarité ?
        });

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/territoires', async (req, res) => {
      if (!statsFct.checkAuth(req)) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }

      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        const rolesAllowed = [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => adminUser?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const schema = statsFct.checkSchema(req);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        const { page, territoire, nomOrdre, ordre } = req.query;
        const dateFin = dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY');
        const dateDebutQuery = new Date(req.query.dateDebut);
        const dateFinQuery = new Date(req.query.dateFin);

        //Construction des statistiques
        let items = {};
        let statsTerritoires = [];
        let ordreColonne = JSON.parse('{"' + nomOrdre + '":' + ordre + '}');

        statsTerritoires = await statsFct.getTerritoires(
          territoire,
          dateFin,
          ordreColonne,
          page > 0 ? ((page - 1) * Number(options.paginate.default)) : 0,
          Number(options.paginate.default),
          statsRepository(db)
        );

        await Promise.all(statsTerritoires.map(async ligneStats => {
          ligneStats.personnesAccompagnees = 0;
          ligneStats.CRAEnregistres = 0;
          ligneStats.tauxActivation = (ligneStats?.nombreConseillersCoselec && ligneStats?.nombreConseillersCoselec > 0) ?
            Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;

          if (ligneStats.conseillerIds.length > 0) {
            const query = { 'conseiller.$id': { $in: ligneStats.conseillerIds }, 'cra.dateAccompagnement': {
              '$gte': dateDebutQuery,
              '$lte': dateFinQuery,
            } };
            const countAccompagnees = await statsCras.getPersonnesAccompagnees(db, query);
            const countRecurrentes = await statsCras.getPersonnesRecurrentes(db, query);
            ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;
            ligneStats.personnesRecurrentes = countRecurrentes.length > 0 ? countRecurrentes[0]?.count : 0;
            ligneStats.CRAEnregistres = await statsCras.getNombreCra(db)(query);
          } else {
            ligneStats.personnesAccompagnees = 0;
            ligneStats.CRAEnregistres = 0;
            ligneStats.personnesRecurrentes = 0;
          }
        }));

        items.total = await statsFct.getTotalTerritoires(dateFin, territoire, statsRepository(db));
        items.data = statsTerritoires;
        items.limit = options.paginate.default;
        items.skip = page;

        res.send({ items: items });
      });
    });

    app.get('/stats/prefet/structures', async (req, res) => {
      if (!statsFct.checkAuth(req)) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }

      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        //update pour la nouvelle API
        if (!statsFct.checkRole(adminUser?.roles, 'prefet') && !statsFct.checkRole(adminUser?.roles, 'admin')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        let items = {};
        const dateDebut = new Date(req.query.dateDebut);
        const dateFin = new Date(req.query.dateFin);
        const page = req.query.page;

        let code = {};
        if (adminUser.departement) {
          code = { 'codeDepartement': String(adminUser.departement) };
        } else if (adminUser.region) {
          code = { 'codeRegion': String(adminUser.region) };
        } else {
          code = { 'statut': 'VALIDATION_COSELEC' };
        }
        const countStructures = await statsFct.countStructures(code, statsRepository(db));
        const structures = await statsFct.getStructuresByPrefetCode(
          code,
          page > 0 ? ((page - 1) * Number(options.paginate.default)) : 0,
          Number(options.paginate.default),
          res,
          statsRepository(db)
        );

        const structuresStatistiques = [];
        await Promise.all(structures.map(async structure => {

          const conseillerIds = await statsFct.getConseillersIdsByStructure(structure._id, res, statsRepository(db));
          const query = { 'conseiller.$id': { $in: conseillerIds }, 'cra.dateAccompagnement': {
            '$gte': dateDebut,
            '$lte': dateFin,
          } };

          const countAccompagnees = await statsCras.getPersonnesAccompagnees(db, query);
          const CRAEnregistres = await statsCras.getNombreCra(db)(query);

          const structureStatistiques = {
            _id: structure._id,
            idPG: structure.idPG,
            siret: structure.siret,
            nom: structure.nom,
            codePostal: structure.codePostal,
            CRAEnregistres,
            personnesAccompagnees: countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0,
          };

          structuresStatistiques.push(structureStatistiques);
        }));

        items.data = structuresStatistiques;
        items.limit = options.paginate.default;
        items.total = countStructures;
        items.skip = page;

        return res.send({ items: items });
      });
    });

    app.get('/stats/prefet/territoires', async (req, res) => {
      if (!statsFct.checkAuth(req)) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }

      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!statsFct.checkRole(adminUser?.roles, 'prefet')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const schema = statsFct.checkSchemaPrefet(req);
        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        const { territoire } = req.query;
        const dateFin = dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY');
        const dateDebutQuery = new Date(req.query.dateDebut);
        const dateFinQuery = new Date(req.query.dateFin);
        const codeDepartement = adminUser.departement;
        const codeRegion = adminUser.region;

        //exception Saint-Martin 978
        const nomRegion = codeDepartement !== '978' ?
          departementsRegion.find(departement => departement.num_dep === codeDepartement)?.region_name :
          'Saint-Martin';

        //Construction des statistiques
        let items = {};
        let statsTerritoires = [];

        statsTerritoires = await statsFct.getTerritoiresPrefet(
          territoire,
          dateFin,
          codeDepartement,
          codeRegion,
          nomRegion,
          statsRepository(db)
        );

        await Promise.all(statsTerritoires.map(async ligneStats => {
          ligneStats.personnesAccompagnees = 0;
          ligneStats.CRAEnregistres = 0;
          ligneStats.tauxActivation = ligneStats?.nombreConseillersCoselec > 0 ?
            Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;

          if (ligneStats.conseillerIds.length > 0) {
            const query = { 'conseiller.$id': { $in: ligneStats.conseillerIds }, 'cra.dateAccompagnement': {
              '$gte': dateDebutQuery,
              '$lte': dateFinQuery,
            } };
            const countAccompagnees = await statsCras.getPersonnesAccompagnees(db, query);
            const countRecurrentes = await statsCras.getPersonnesRecurrentes(db, query);
            ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;
            ligneStats.personnesRecurrentes = countRecurrentes.length > 0 ? countRecurrentes[0]?.count : 0;
            ligneStats.CRAEnregistres = await statsCras.getNombreCra(db)(query);
          } else {
            ligneStats.personnesAccompagnees = 0;
            ligneStats.CRAEnregistres = 0;
            ligneStats.personnesRecurrentes = 0;
          }
        }));
        items.data = statsTerritoires;
        res.send({ items: items });
      });
    });

    app.get('/stats/territoire/cra', async (req, res) => {

      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role admin_coop
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        const rolesAllowed = [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => user?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        const conseillerIds = JSON.parse(req.query?.conseillerIds);
        //Construction des statistiques
        let stats = {};

        if (conseillerIds) {
          let ids = [];
          ids = conseillerIds.map(id => new ObjectID(id));
          let query = {
            'cra.dateAccompagnement': {
              '$gte': dateDebut,
              '$lte': dateFin,
            },
            'conseiller.$id': { $in: ids },
          };

          stats = await statsCras.getStatsGlobales(db, query, statsCras, statsFct.checkRole(user.roles, Role.AdminCoop));
        }

        res.send(stats);
      });
    });

    app.get('/stats/structure/cra', async (req, res) => {
      app.get('mongoClient').then(async db => {
        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role structure_coop
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        if (!user?.roles.includes('prefet') && !user?.roles.includes('admin')) {
          const structureId = user.entity.oid;
          if (!user?.roles.includes('structure_coop') && structureId !== req.query.idStructure) {
            res.status(403).send(new Forbidden('User not authorized', {
              userId: userId
            }).toJSON());
            return;
          }
        }
        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);
        const idStructure = new ObjectID(req.query?.idStructure);
        const conseillerIds = await statsFct.getConseillersIdsByStructure(idStructure, res, statsRepository(db));

        //Construction des statistiques
        let stats = {};
        let query = {
          'cra.dateAccompagnement': {
            '$gte': dateDebut,
            '$lte': dateFin,
          },
          'conseiller.$id': { $in: conseillerIds },
        };
        if (req.query?.codePostal !== '' && req.query?.codePostal !== 'null') {
          query['cra.codePostal'] = req.query?.codePostal;
        }
        const rolesAllowed = [Role.Admin, Role.Prefet, Role.AdminCoop];

        stats = await statsCras.getStatsGlobales(db, query, statsCras, statsFct.checkRole(user.roles, rolesAllowed));
        res.send(stats);
      });
    });

    app.get('/stats/nationales/cra', async (req, res) => {

      app.get('mongoClient').then(async db => {

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
          return;
        }
        //Verification role admin_coop
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        const rolesAllowed = [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => user?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        //Composition de la partie query en formattant la date
        let dateDebut = new Date(req.query?.dateDebut);
        dateDebut.setUTCHours(0, 0, 0, 0);
        let dateFin = new Date(req.query?.dateFin);
        dateFin.setUTCHours(23, 59, 59, 59);

        let query = {
          'cra.dateAccompagnement': {
            '$gte': dateDebut,
            '$lte': dateFin,
          }
        };

        const stats = await statsCras.getStatsGlobales(db, query, statsCras, statsFct.checkRole(user.roles, Role.AdminCoop));

        res.send(stats);
      });
    });

    app.get('/stats/admincoop/territoire', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      app.get('mongoClient').then(async db => {
        let userId = decode(req.feathers.authentication.accessToken).sub;
        const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
        const rolesAllowed = [Role.AdminCoop, Role.StructureCoop, Role.HubCoop, Role.Coordinateur];
        if (rolesAllowed.filter(role => adminUser?.roles.includes(role)).length === 0) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const schema = Joi.object({
          typeTerritoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
          idTerritoire: Joi.string().min(2).max(3).required().error(new Error('L\'id du territoire est invalide')),
          dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
        }).validate(req.query);

        if (schema.error) {
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }

        const { typeTerritoire, idTerritoire } = req.query;
        const dateFin = dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY');

        try {
          let territoire = {};
          if (typeTerritoire === 'codeDepartement') {
            territoire = await db.collection('stats_Territoires').findOne({ 'date': dateFin, [typeTerritoire]: idTerritoire });
            res.send(territoire);
          } else if (typeTerritoire === 'codeRegion') {

            territoire = await db.collection('stats_Territoires').aggregate([
              { $match: { date: dateFin, [typeTerritoire]: idTerritoire } },
              { $group: {
                _id: {
                  codeRegion: '$codeRegion',
                  nomRegion: '$nomRegion',
                },
                conseillerIds: { $push: '$conseillerIds' }
              } },
              { $addFields: { 'codeRegion': '$_id.codeRegion', 'nomRegion': '$_id.nomRegion' } },
              { $project: {
                '_id': 0,
                'codeRegion': 1,
                'nomRegion': 1,
                'conseillerIds': {
                  $reduce: {
                    input: '$conseillerIds',
                    initialValue: [],
                    in: { $concatArrays: ['$$value', '$$this'] }
                  }
                }
              } }
            ]).toArray();
            res.send(territoire[0]);
          }
          return;
        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(400).send(new BadRequest('Erreur : ' + schema.error).toJSON());
          return;
        }
      });
    });
  }
};
