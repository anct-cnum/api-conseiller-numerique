const { ObjectID } = require('mongodb');
const dayjs = require('dayjs');

const utils = require('../../utils/index.js');
const { jwtDecode } = require('jwt-decode');
const { NotFound, Forbidden } = require('@feathersjs/errors');
const {
  validateExportTerritoireSchema,
  buildExportTerritoiresCsvFileContent,
  getExportTerritoiresFileName
} = require('./export-territoires/utils/export-territoires.utils');
const { getStatsTerritoires } = require('./export-territoires/core/export-territoires.core');
const { statsTerritoiresRepository } = require('./export-territoires/repositories/export-territoires.repository');
const {
  canActivate,
  authenticationGuard,
  rolesGuard,
  schemaGuard,
  Role,
  checkAuth,
  authenticationFromRequest,
  userIdFromRequestJwt,
  abort,
  csvFileResponse
} = require('../../common/utils/feathers.utils');
const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const { statsCnfsRepository } = require('./export-cnfs/repositories/export-cnfs.repository');
const { getStatsCnfs, userConnected, getCnfsWithoutCRA } = require('./export-cnfs/core/export-cnfs.core');
const {
  buildExportCnfsCsvFileContent,
  buildExportCnfsWithoutCRACsvFileContent,
  validateExportCnfsSchema,
  exportCnfsQueryToSchema,
  getExportCnfsFileName
} = require('./export-cnfs/utils/export-cnfs.utils');
const {
  findDepartementOrRegion,
  buildExportHubCnfsCsvFileContent
} = require('./export-cnfs-hub/utils/export-cnfs-hub.utils.js');
const { exportCnfsHubRepository } = require('./export-cnfs-hub/repositories/export-cnfs-hub.repository.js');
const { getStatsCnfsHubs } = require('./export-cnfs-hub/core/export-cnfs-hub.core.js');

const { exportCnfsCoordinateurRepository } = require('./export-cnfs-coordinateur/repositories/export-cnfs-coordinateur.repository');
const { getStatsCnfsCoordinateur } = require('./export-cnfs-coordinateur/core/export-cnfs-coordinateur.core');
const { ObjectId } = require('mongodb');

exports.DataExports = class DataExports {
  constructor(options, app) {
    this.options = options || {};

    let db;

    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
    });

    app.get('/exports/candidats.csv', checkAuth, async (req, res) => {
      //verify user role admin
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!adminUser?.roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      const miseEnrelations = await db.collection('misesEnRelation').find({
        $or: [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }, { 'statut': { $eq: 'nouvelle_rupture' } }]
      }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
      let promises = [];
      res.write('Date candidature;Date prévisionnelle de recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection; Demande de rupture; Date de la rupture; Motif de la rupture\n');

      const formatDate = date => dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');
      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
          let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
          let coselec = utils.getCoselec(structure);
          res.write(`${conseiller?.createdAt ? formatDate(conseiller?.createdAt) : 'non renseignée'};${miseEnrelation?.dateRecrutement ? formatDate(miseEnrelation.dateRecrutement) : 'non renseignée'};${conseiller?.prenom};${conseiller?.nom};${conseiller?.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller?.telephone};${conseiller?.email};${conseiller?.codePostal};${conseiller?.nomCommune};${conseiller?.codeDepartement};${conseiller?.estDiplomeMedNum ? 'oui' : 'non'};${conseiller?.pix ? conseiller?.pix?.palier : ''};${structure?.siret};${structure?.idPG};${structure?.nom};${structure?.type};${structure?.codePostal};${structure?.codeCommune};${structure?.codeDepartement};${structure?.codeRegion};${structure?.contact?.prenom};${structure?.contact?.nom};${structure?.contact?.telephone};${structure?.contact?.email};${conseiller?.idPG};${coselec !== null ? coselec?.numero : ''};${coselec !== null ? coselec?.nombreConseillersCoselec : 0};${miseEnrelation.statut === 'nouvelle_rupture' ? 'oui' : 'non'};${miseEnrelation.dateRupture ? formatDate(miseEnrelation.dateRupture) : 'non renseignée'};${miseEnrelation.motifRupture ?? 'non renseignée'}\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/candidatsValidesStructure.csv', checkAuth, async (req, res) => {
      //verify user role admin
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!adminUser?.roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      const miseEnrelations = await db.collection('misesEnRelation').find({
        'statut': { $eq: 'recrutee' }
      }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
      let promises = [];

      res.write('Date candidature;Date prévisionnelle de recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n');

      const formatDate = date => dayjs(new Date(date?.getTime() + 120 * 60000)).format('DD/MM/YYYY');
      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
          let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
          let coselec = utils.getCoselec(structure);
          res.write(`${formatDate(conseiller.createdAt)};${miseEnrelation?.dateRecrutement ? formatDate(miseEnrelation.dateRecrutement) : 'non renseignée'};${conseiller.prenom};${conseiller.nom};${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller.telephone};${conseiller.email};${conseiller.codePostal};${conseiller.nomCommune};${conseiller.codeDepartement};${conseiller.estDiplomeMedNum ? 'oui' : 'non'};${conseiller.pix ? conseiller.pix.palier : ''};${structure.siret};${structure.idPG};${structure.nom};${structure.type};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure?.contact?.prenom};${structure?.contact?.nom};${structure?.contact?.telephone};${structure?.contact?.email};${conseiller.idPG};${coselec !== null ? coselec?.numero : ''};${coselec !== null ? coselec?.nombreConseillersCoselec : 0};\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/ruptures.csv', checkAuth, async (req, res) => {
      //verify user role admin
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!adminUser?.roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }
      let miseEnrelations;

      miseEnrelations = await db.collection('misesEnRelation').find({
        'statut': { $eq: 'nouvelle_rupture' }
      }).toArray();

      let promises = [];

      res.write('Prénom;Nom;Email;Id CNFS;Nom Structure;Id Structure;Date rupture;Motif de rupture\n');
      const formatDate = date => dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');
      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: miseEnrelation.conseiller.oid });
          let structure = await db.collection('structures').findOne({ _id: miseEnrelation.structure.oid });
          res.write(`${conseiller.prenom};${conseiller.nom};${conseiller.email};${conseiller.idPG};${structure.nom};${structure.idPG};${miseEnrelation?.dateRupture ? formatDate(miseEnrelation.dateRupture) : 'Non renseignée'};${miseEnrelation.motifRupture}\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/embauches.csv', checkAuth, async (req, res) => {
      //verify user role admin
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!adminUser?.roles.includes('admin') && !adminUser?.roles.includes('prefet')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }
      let miseEnrelations;
      if (adminUser?.roles.includes('prefet')) {
        if (adminUser?.departement) {
          miseEnrelations = await db.collection('misesEnRelation').find({
            'statut': { $eq: 'finalisee' },
            'structureObj.codeDepartement': `${adminUser?.departement}`
          }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
        } else {
          miseEnrelations = await db.collection('misesEnRelation').find({
            'statut': { $eq: 'finalisee' },
            'structureObj.codeRegion': `${adminUser?.region}`
          }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
        }
      } else {
        miseEnrelations = await db.collection('misesEnRelation').find({
          'statut': { $eq: 'finalisee' }
        }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
      }

      let promises = [];

      res.write('Date candidature;Date prévisionnelle de recrutement;Date d’entrée en formation;Date de sortie de formation;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n');

      const formatDate = date => dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');
      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
          let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
          let coselec = utils.getCoselec(structure);
          res.write(`${conseiller?.createdAt ? formatDate(conseiller?.createdAt) : 'non renseignée'};${miseEnrelation.dateRecrutement ? formatDate(miseEnrelation.dateRecrutement) : 'non renseignée'};${conseiller?.datePrisePoste ? formatDate(conseiller?.datePrisePoste) : 'non renseignée'};${conseiller?.dateFinFormation ? formatDate(conseiller?.dateFinFormation) : 'non renseignée'};${conseiller?.prenom};${conseiller?.nom};${conseiller?.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller?.telephone};${conseiller?.email};${conseiller?.codePostal};${conseiller?.nomCommune};${conseiller?.codeDepartement};${conseiller?.estDiplomeMedNum ? 'oui' : 'non'};${conseiller?.pix ? conseiller?.pix?.palier : ''};${structure?.siret};${structure?.idPG};${structure?.nom};${structure?.type};${structure?.codePostal};${structure?.codeCommune};${structure?.codeDepartement};${structure?.codeRegion};${structure?.contact?.prenom};${structure?.contact?.nom};${structure?.contact?.telephone};${structure?.contact?.email};${conseiller?.idPG};${coselec !== null ? coselec?.numero : ''};${coselec !== null ? coselec?.nombreConseillersCoselec : 0};\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/candidatsByStructure.csv', checkAuth, async (req, res) => {
      //verify user role structure
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const structureUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!structureUser?.roles.includes('structure')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: structureUser
        }).toJSON());
        return;
      }
      //verify structure associated to user
      try {
        const structure = await db.collection('structures').findOne({ _id: new ObjectID(structureUser.entity.oid) });
        if (structure === null) {
          res.status(404).send(new NotFound('Structure not found', {
            id: structureUser.entity.oid
          }).toJSON());
          return;
        }
      } catch (error) {
        app.get('sentry').captureException(error);
      }

      const miseEnrelations = await db.collection('misesEnRelation').find({ 'structure.$id': structureUser.entity.oid, 'statut': { $ne: 'finalisee_non_disponible' } }).collation({ locale: 'fr' }).sort({ 'conseillerObj.nom': 1, 'conseillerObj.prenom': 1 }).toArray();
      let promises = [];

      res.write('Nom;Prénom;Email;Code postal;Expérience;Test PIX;CV\n');
      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: miseEnrelation.conseiller.oid });
          res.write(`${conseiller.nom};${conseiller.prenom};${conseiller.email};${conseiller.codePostal};${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller.pix === undefined ? 'non' : 'oui'};${conseiller.cv === undefined ? 'non' : 'oui'}\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/structures.csv', checkAuth, async (req, res) => {
      //verify user role admin
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!adminUser?.roles.includes('admin')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      const structures = await db.collection('structures').find().toArray();
      let promises = [];
      res.write('SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau\n');
      structures.forEach(structure => {
        promises.push(new Promise(async resolve => {
          const matchings = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': new ObjectID(structure._id) });
          const user = await db.collection('users').findOne({ 'entity.$id': new ObjectID(structure._id) });
          try {
            const coselec = utils.getCoselec(structure);

            // France Services
            let label = 'non renseigné';
            if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'OUI') {
              label = 'oui';
            } else if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'NON') {
              label = 'non';
            }

            // Adresse
            let adresse = (structure?.insee?.adresse?.numero_voie ?? '') + ' ' +
            (structure?.insee?.adresse?.type_voie ?? '') + ' ' +
            (structure?.insee?.adresse?.libelle_voie ?? '') + '\n' +
            (structure?.insee?.adresse?.complement_adresse ? structure.insee.adresse.complement_adresse + '\n' : '') +
            (structure?.insee?.adresse?.code_postal ?? '') + ' ' +
            (structure?.insee?.adresse?.libelle_commune ?? '');

            adresse = adresse.replace(/["']/g, '');

            res.write(`${structure.siret};${structure.idPG};${structure.nom};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.statut};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure?.contact?.telephone};${structure?.contact?.email};${structure.userCreated ? 'oui' : 'non'};${user !== null && user.passwordCreated ? 'oui' : 'non'};${matchings};${structure.nombreConseillersSouhaites ?? 0};${structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.nombreConseillersCoselec : 0};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.numero : ''};${structure.estZRR ? 'oui' : 'non'};${structure.qpvStatut ?? 'Non défini'};${structure?.qpvListe ? structure.qpvListe.length : 0};${label};${structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale ? structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale : ''};${structure?.insee?.adresse?.libelle_commune ? structure?.insee?.adresse?.libelle_commune : ''};${structure?.insee?.adresse?.code_commune ? structure?.insee?.adresse?.code_commune : ''};"${adresse}";${structure?.insee?.unite_legale?.forme_juridique?.libelle ?? ''};${structure?.reseau ? 'oui' : 'non'};${structure?.reseau ?? ''}\n`);
          } catch (e) {
            // TODO : logger
          }
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/structuresPrefet.csv', checkAuth, async (req, res) => {
      //verify user role prefet
      let userId = jwtDecode(req.feathers.authentication?.accessToken)?.sub;
      const prefetUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!prefetUser?.roles.includes('prefet')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: prefetUser
        }).toJSON());
        return;
      }

      //Prefet with or without codeRegion
      let structures = [];
      if (prefetUser.region !== undefined) {
        structures = await db.collection('structures').find({ codeRegion: prefetUser.region.toString() }).toArray();
      } else if (prefetUser.departement !== undefined) {
        structures = await db.collection('structures').find({ codeDepartement: prefetUser.departement.toString() }).toArray();
      }

      let promises = [];
      res.write('SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau\n');

      structures.forEach(structure => {
        promises.push(new Promise(async resolve => {
          const matchings = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': structure._id });
          const isActiveStructure = await db.collection('users').countDocuments({ 'entity.$id': structure._id, 'passwordCreated': true });

          const coselec = utils.getCoselec(structure);
          // France Services
          let label = 'non renseigné';
          if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'OUI') {
            label = 'oui';
          } else if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'NON') {
            label = 'non';
          }
          // Adresse
          let adresse = (structure?.insee?.adresse?.numero_voie ?? '') + ' ' +
          (structure?.insee?.adresse?.type_voie ?? '') + ' ' +
          (structure?.insee?.adresse?.libelle_voie ?? '') + '\n' +
          (structure?.insee?.adresse?.complement_adresse ? structure.insee.adresse.complement_adresse + '\n' : '') +
          (structure?.insee?.adresse?.code_postal ?? '') + ' ' +
          (structure?.insee?.adresse?.libelle_commune ?? '');

          adresse = adresse.replace(/["']/g, '');

          res.write(`${structure.siret};${structure.idPG};${structure.nom};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.statut};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure?.contact?.telephone};${structure?.contact?.email};${structure.userCreated ? 'oui' : 'non'};${isActiveStructure >= 1 ? 'OUI' : 'NON'};${matchings};${structure.nombreConseillersSouhaites ?? 0};${structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.nombreConseillersCoselec : 0};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.numero : ''};${structure.estZRR ? 'oui' : 'non'};${structure.qpvStatut ?? 'Non défini'};${structure?.qpvListe ? structure.qpvListe.length : 0};${label};${structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale ? structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale : ''};${structure?.insee?.adresse?.libelle_commune ? structure?.insee?.adresse?.libelle_commune : ''};${structure?.insee?.adresse?.code_commune ? structure?.insee?.adresse?.code_commune : ''};"${adresse}";${structure?.insee?.unite_legale?.forme_juridique?.libelle ?? ''};${structure?.reseau ? 'oui' : 'non'};${structure?.reseau ?? ''}\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });

    app.get('/exports/territoires.csv', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.AdminCoop, Role.HubCoop], userAuthenticationRepository(db)),
        schemaGuard(validateExportTerritoireSchema(req.query))
      ).then(async () => {
        const statsTerritoires = await getStatsTerritoires(req.query, statsTerritoiresRepository(db));
        csvFileResponse(
          res,
          getExportTerritoiresFileName(req.query.territoire, req.query.dateDebut, req.query.dateFin),
          buildExportTerritoiresCsvFileContent(statsTerritoires, req.query.territoire)
        );
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/exports/hubcoop/cnfs.csv', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.HubCoop], userAuthenticationRepository(db))
      ).then(async () => {
        const userId = await userIdFromRequestJwt(app, req, res);
        if (!ObjectId.isValid(userId)) {
          return res.status(401).send({ message: 'Accès non autorisé' });
        }
        const user = await userAuthenticationRepository(db)(userId);
        const hubName = user.hub;
        const hub = findDepartementOrRegion(hubName);
        if (hub === undefined) {
          res.status(404).send(new NotFound('Hub not found', {
            hubName
          }).toJSON());
          return;
        }
        const statsCnfs = await getStatsCnfsHubs(hub, exportCnfsHubRepository(db));
        csvFileResponse(res, `export-cnfs_${dayjs(new Date()).format('YYYY-MM-DD')}_${hubName}.csv`, `${await buildExportHubCnfsCsvFileContent(statsCnfs)}`);
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/exports/cnfs.csv', async (req, res) => {
      const query = exportCnfsQueryToSchema(req.query);
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.AdminCoop, Role.StructureCoop], userAuthenticationRepository(db)),
        schemaGuard(validateExportCnfsSchema(query))
      ).then(async authentication => {
        const user = await userConnected(db, authentication);
        if (user?.roles.includes('structure_coop') && user?.entity?.oid?.toString() !== query.structureId) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: user._id
          }).toJSON());
          return;
        }
        const statsCnfs = await getStatsCnfs(query, statsCnfsRepository(db));
        csvFileResponse(res, getExportCnfsFileName(query.dateDebut, query.dateFin), `${await buildExportCnfsCsvFileContent(statsCnfs, user)}`);
      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/exports/subordonnes.csv', async (req, res) => {
      const query = exportCnfsQueryToSchema(req.query);
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }

      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.Coordinateur], userAuthenticationRepository(db)),
        schemaGuard(validateExportCnfsSchema(query))
      ).then(async authentication => {
        const user = await userConnected(db, authentication);
        query.user = user;
        const statsCnfs = await getStatsCnfsCoordinateur(query, exportCnfsCoordinateurRepository(db));

        csvFileResponse(res, getExportCnfsFileName(query.dateDebut, query.dateFin), `${await buildExportCnfsCsvFileContent(statsCnfs, user)}`);

      }).catch(routeActivationError => abort(res, routeActivationError));
    });

    app.get('/exports-without-cra/cnfs.csv', async (req, res) => {
      const db = await app.get('mongoClient');
      const userId = await userIdFromRequestJwt(app, req, res);
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ message: 'Accès non autorisé' });
      }
      canActivate(
        authenticationGuard(authenticationFromRequest(req)),
        rolesGuard(userId, [Role.AdminCoop], userAuthenticationRepository(db))
      ).then(async authentication => {
        const user = await userConnected(db, authentication);
        if (!user?.roles.includes('admin_coop')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: user._id
          }).toJSON());
          return;
        }
        const conseillers = await getCnfsWithoutCRA(statsCnfsRepository(db));
        if (conseillers.length) {
          csvFileResponse(res, 'export_cnfs_m2.csv', `${await buildExportCnfsWithoutCRACsvFileContent(conseillers, user)}`);
        } else {
          res.status(404).send(new NotFound('Aucun conseillers'));
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }

  async find() {
    return [];
  }

  async get(id) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }

    return data;
  }

  async update(id, data) {
    return data;
  }

  async patch(id, data) {
    return data;
  }

  async remove(id) {
    return { id };
  }
};
