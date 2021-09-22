const { ObjectID, DBRef } = require('mongodb');

const { BadRequest, NotFound, Forbidden, NotAuthenticated, GeneralError } = require('@feathersjs/errors');

const { Service } = require('feathers-mongodb');

const axios = require('axios');
const logger = require('../../logger');
const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const decode = require('jwt-decode');
const { Pool } = require('pg');
const utils = require('../../utils/index.js');

const pool = new Pool();

exports.Structures = class Structures extends Service {
  constructor(options, app) {
    super(options);

    let db;

    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
      this.Model = db.collection('structures');
    });

    app.post('/structures/:id/preSelectionner/:conseillerId', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role structure
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const structureUser = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (!structureUser?.roles.includes('structure')) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: structureUser
        }).toJSON());
        return;
      }

      let structureId = null;
      let conseillerId = null;
      try {
        structureId = new ObjectID(req.params.id);
        conseillerId = new ObjectID(req.params.conseillerId);
      } catch (e) {
        res.status(404).send(new NotFound('Structure or conseiller not found', {
          id: req.params.id
        }).toJSON());
        return;
      }

      let structure = await db.collection('structures').findOne({ _id: structureId });
      let conseiller = await db.collection('conseillers').findOne({ _id: conseillerId });

      if (structure === null || conseiller === null) {
        res.status(404).send(new NotFound('Structure or conseiller not found', {
          id: req.params.id,
          conseillerId: req.params.conseillerId
        }).toJSON());
      }

      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const miseEnRelation = await db.collection('misesEnRelation').insertOne({
        conseiller: new DBRef('conseillers', conseillerId, database),
        structure: new DBRef('structures', structureId, database),
        statut: 'interessee',
        type: 'MANUEL',
        createdAt: new Date(),
        conseillerCreatedAt: conseiller.createdAt,
        conseillerObj: conseiller,
        structureObj: structure
      });

      res.status(201).send({ misEnRelation: miseEnRelation.ops[0] });
    });

    app.get('/structures/:id/misesEnRelation/stats', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      let rolesUserAllowed = user?.roles.filter(role => ['admin', 'structure', 'prefet'].includes(role));
      if (rolesUserAllowed.length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: user
        }).toJSON());
        return;
      }

      let structureId = null;
      try {
        structureId = new ObjectID(req.params.id);
      } catch (e) {
        res.status(404).send(new NotFound('Structure not found', {
          id: req.params.id
        }).toJSON());
        return;
      }

      const stats = await db.collection('misesEnRelation').aggregate([
        { '$match': { 'structure.$id': structureId } },
        { '$group': { _id: '$statut', count: { $sum: 1 } } },
        { '$sort': { '_id': 1 } }
      ]).toArray();

      /* ajout des candidats dont le recrutement est finalisé dans détails structure*/
      const misesEnRelation = await db.collection('misesEnRelation').find({ 'statut': 'finalisee', 'structure.$id': structureId }).toArray();
      const candidats = misesEnRelation.map(item => {
        item = `${item.conseillerObj.nom} ${item.conseillerObj.prenom}`;
        return item;
      });

      res.send(stats.map(item => {
        item.statut = item._id;
        if (item.statut === 'finalisee') {
          item.candidats = candidats;
        }
        delete item._id;
        return item;
      }));
    });

    app.get('/structures/:id/misesEnRelation', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      let rolesUserAllowed = user?.roles.filter(role => ['admin', 'structure', 'prefet'].includes(role));
      if (rolesUserAllowed.length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: user
        }).toJSON());
        return;
      }

      const misesEnRelationService = app.service('misesEnRelation');
      let structureId = null;
      try {
        structureId = new ObjectID(req.params.id);
      } catch (e) {
        res.status(404).send(new NotFound('Structure not found', {
          id: req.params.id
        }).toJSON());
        return;
      }

      let queryFilter = {};
      const { filter } = req.query;
      const search = req.query['$search'];
      if (filter) {
        const allowedFilters = ['nouvelle', 'interessee', 'nonInteressee', 'recrutee', 'finalisee', 'toutes'];
        if (allowedFilters.includes(filter)) {
          if (filter !== 'toutes') {
            queryFilter = { statut: filter };
          }
        } else {
          res.status(400).send(new BadRequest('Invalid filter', {
            filter
          }).toJSON());
          return;
        }
      }

      if (search) {
        queryFilter['$text'] = { $search: '"' + search + '"' };
      }

      //User Filters
      let { pix, diplome, cv } = req.query;
      if (pix !== undefined) {
        pix = pix.split(',').map(k => parseInt(k));
        queryFilter['conseillerObj.pix.palier'] = { $in: pix };
      }
      if (diplome !== undefined) {
        queryFilter['conseillerObj.estDiplomeMedNum'] = (diplome === 'true');
      }
      if (cv !== undefined) {
        queryFilter['conseillerObj.cv'] = (cv === 'true') ? { '$ne': null } : { $in: [null] };
      }

      const skip = req.query['$skip'];
      if (skip) {
        queryFilter['$skip'] = skip;
      }
      const sort = req.query['$sort'];
      if (sort) {
        queryFilter['$sort'] = sort;
      }

      const misesEnRelation = await misesEnRelationService.find({ query: Object.assign({ 'structure.$id': structureId }, queryFilter) });
      if (misesEnRelation.total === 0) {
        res.send(misesEnRelation);
        return;
      }
      res.send(misesEnRelation);
    });

    app.post('/structures/:id/relance-inscription', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      let adminId = decode(req.feathers.authentication.accessToken).sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(adminId) });
      if (adminUser?.roles.filter(role => ['admin'].includes(role)).length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      let structureId = null;
      try {
        structureId = new ObjectID(req.params.id);
      } catch (e) {
        res.status(404).send(new NotFound('Structure not found', {
          id: req.params.id
        }).toJSON());
        return;
      }

      //La structure associée doit etre validée en COSELEC pour relancer une inscription
      let structure = await db.collection('structures').findOne({ _id: structureId });
      if (structure === null) {
        res.status(404).send(new NotFound('Structure not found', {
          structureId: structureId,
        }).toJSON());
      }
      if (structure.statut !== 'VALIDATION_COSELEC') {
        res.status(400).send(new BadRequest('Structure not validated in COSELEC', {
          structure: structure,
        }).toJSON());
      }

      try {
        const structureUser = await db.collection('users').findOne({ 'entity.$id': new ObjectID(structureId) });
        if (structureUser === null) {
          res.status(404).send(new NotFound('User associated to structure not found', {
            id: req.params.id
          }).toJSON());
          return;
        }
        let mailer = createMailer(app);
        const emails = createEmails(db, mailer, app);
        let message = emails.getEmailMessageByTemplateName('creationCompteStructure');
        await message.send(structureUser);
        res.send(structureUser);

      } catch (error) {
        app.get('sentry').captureException(error);
      }

    });

    app.post('/structures/verifyStructureSiret', async (req, res) => {

      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      let adminId = decode(req.feathers.authentication.accessToken).sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(adminId) });
      if (adminUser?.roles.filter(role => ['admin'].includes(role)).length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      try {
        const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${req.body.siret}`;
        const params = {
          token: app.get('api_entreprise'),
          context: 'cnum',
          recipient: 'cnum',
          object: 'checkSiret',
        };
        const result = await axios.get(urlSiret, { params: params });
        return res.send({ 'nomStructure': result.data.etablissement.adresse.l1 });
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
        return res.status(404).send(new NotFound('Le numéro de SIRET ( N° ' + req.body.siret + ' ) que vous avez demandé n\'existe pas !').toJSON());
      }
    });

    app.patch('/structures/:id/email', async (req, res) => {
      const { email } = req.body;
      const structureId = req.params.id;
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      let adminId = decode(req.feathers.authentication.accessToken).sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(adminId) });
      if (adminUser?.roles.filter(role => ['admin'].includes(role)).length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminId
        }).toJSON());
        return;
      }

      const structure = await db.collection('structures').findOne({ _id: new ObjectID(structureId) });
      if (!structure) {
        return res.status(404).send(new NotFound('Structure not found', {
          structureId
        }).toJSON());
      }

      const updateStructure = async (id, email) => {
        try {
          await pool.query(`
          UPDATE djapp_hostorganization
          SET contact_email = $2
          WHERE id = $1`,
          [id, email]);
          await db.collection('structures').updateOne({ _id: new ObjectID(structureId) }, { $set: { 'contact.email': email } });
          await db.collection('users').updateOne(
            { 'name': structure.contact.email, 'entity.$id': new ObjectID(structureId), 'roles': 'structure' },
            { $set: { name: email }
            });
          await db.collection('misesEnRelation').updateMany(
            { 'structure.$id': new ObjectID(structureId) },
            { $set: { 'structureObj.contact.email': email }
            });
          res.send({ emailUpdated: true });
        } catch (error) {
          logger.error(error.message);
          app.get('sentry').captureException(error);
          res.status(500).send(new GeneralError(`Echec du changement d'email de la structure ${structure.nom}`));
        }
      };
      await updateStructure(structure.idPG, email);
    });

    app.post('/structures/updateStructureSiret', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      let adminId = decode(req.feathers.authentication.accessToken).sub;
      const adminUser = await db.collection('users').findOne({ _id: new ObjectID(adminId) });
      if (adminUser?.roles.filter(role => ['admin'].includes(role)).length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: adminUser
        }).toJSON());
        return;
      }

      const structure = await db.collection('structures').findOne({ _id: new ObjectID(req.body.structureId) });
      if (!structure) {
        return res.status(404).send(new NotFound('Structure not found', {
          structureId: req.body.structureId
        }).toJSON());
      }

      const updateStructure = async (id, siret) => {
        try {
          await pool.query(`
            UPDATE djapp_hostorganization
            SET siret = $2
            WHERE id = $1`,
          [id, siret]);
          await db.collection('structures').updateOne({ _id: new ObjectID(req.body.structureId) }, { $set: { siret: req.body.siret } });
          res.send({ siretUpdated: true });
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
          res.status(500).send(new GeneralError('Un problème avec la base de données est survenu ! Veuillez recommencer.'));
        }
      };

      await updateStructure(structure.idPG, req.body.siret);


    });

    app.get('/structures/getAvancementRecrutement', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
        return;
      }
      //verify user role
      let userId = decode(req.feathers.authentication.accessToken).sub;
      const user = await db.collection('users').findOne({ _id: new ObjectID(userId) });
      if (user?.roles.filter(role => ['prefet'].includes(role)).length < 1) {
        res.status(403).send(new Forbidden('User not authorized', {
          userId: user
        }).toJSON());
        return;
      }

      let structures = [];
      if (user?.region) {
        structures = await db.collection('structures').find({
          codeRegion: user?.region.toString(),
          statut: 'VALIDATION_COSELEC',
          userCreated: true }).toArray();
      } else if (user?.departement) {
        structures = await db.collection('structures').find({
          codeDepartement: user?.departement.toString(),
          statut: 'VALIDATION_COSELEC',
          userCreated: true }).toArray();
      }

      let nombreCandidatsRecrutes = 0;
      let nombreDotations = 0;
      let promises = [];

      structures.forEach(structure => {
        const coselec = utils.getCoselec(structure);
        if (coselec) {
          nombreDotations += coselec.nombreConseillersCoselec;
        }
        promises.push(new Promise(async resolve => {
          let candidatsRecrutes = await db.collection('misesEnRelation').countDocuments({
            'statut': 'finalisee',
            'structure.$id': new ObjectID(structure._id)
          });
          nombreCandidatsRecrutes += candidatsRecrutes;
          resolve();
        }));
      });
      await Promise.all(promises);
      const pourcentage = nombreDotations !== 0 ? Math.round(nombreCandidatsRecrutes * 100 / nombreDotations) : 0;

      return res.send({ 'candidatsRecrutes': nombreCandidatsRecrutes, 'dotations': nombreDotations, 'pourcentage': pourcentage });
    });

  }
};
