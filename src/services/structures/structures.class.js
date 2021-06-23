const { ObjectID, DBRef } = require('mongodb');

const { BadRequest, NotFound, Forbidden, NotAuthenticated } = require('@feathersjs/errors');

const { Service } = require('feathers-mongodb');

const createEmails = require('../../emails/emails');
const createMailer = require('../../mailer');
const decode = require('jwt-decode');

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
      let { pix, diplome } = req.query;
      if (pix !== undefined) {
        pix = pix.split(',').map(k => parseInt(k));
        queryFilter['conseillerObj.pix.palier'] = { $in: pix };
      }
      if (diplome !== undefined) {
        queryFilter['conseillerObj.estDiplomeMedNum'] = (diplome === 'true');
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
      console.log('misesEnRelation:', misesEnRelation.total);

      // je creer une liste pour récuperer tout les idPG des conseiller lier à la structure
      const ListeConseillerStructure = await misesEnRelation.data.map(o => o.conseillerObj.idPG);
      // je fais un find des conseillers qui contient les idPG dans la liste
      // eslint-disable-next-line max-len
      const conseillerCandidat = await misesEnRelationService.find({ query: { 'conseillerObj.idPG': { $in: ListeConseillerStructure }, 'statut': 'finalisee' } });
      misesEnRelation.conseillerCandidat = conseillerCandidat;
      if (misesEnRelation.total === 0) {
        res.send(misesEnRelation);
        return;
      }
      res.send(misesEnRelation);
    });

    app.get('/structures/:id/relance-inscription', async (req, res) => {
      if (req.feathers?.authentication === undefined) {
        res.status(401).send(new NotAuthenticated('User not authenticated'));
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

  }
};
