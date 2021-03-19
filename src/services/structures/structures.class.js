const { ObjectID } = require('mongodb');

const { BadRequest, NotFound } = require('@feathersjs/errors');

const { Service } = require('feathers-mongodb');

exports.Structures = class Structures extends Service {
  constructor(options, app) {
    super(options);

    let db;

    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
      this.Model = db.collection('structures');
    });

    // TODO : n'est pas filtré par les hooks (pas d'authentification)
    app.get('/structures/:id/misesEnRelation/stats', async (req, res) => {
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
        { '$group': { _id: '$statut', count: { $sum: 1 } } }
      ]).toArray();

      res.send(stats.map(item => {
        item.statut = item._id;
        delete item._id;
        return item;
      }));
    });

    // TODO : n'est pas filtré par les hooks (pas d'authentification)
    app.get('/structures/:id/misesEnRelation', async (req, res) => {
      const misesEnRelationService = app.service('misesEnRelation');
      const conseillersService = app.service('conseillers');

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
      if (filter) {
        const allowedFilters = ['nouvelle', 'interessee', 'nonInteressee', 'recrutee', 'toutes'];
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
      //User Filters
      let { pix, diplome, emploi } = req.query;
      if (pix !== undefined) {
        pix = pix.split(',').map(k => parseInt(k));
        queryFilter['conseillerObj.pix.palier'] = { $in: pix };
      }
      if (diplome !== undefined) {
        queryFilter['conseillerObj.estDiplomeMedNum'] = (diplome === 'true');
      }
      if (emploi !== undefined) {
        queryFilter['conseillerObj.estEnEmploi'] = (emploi === 'true');
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

      const findConseiller = async miseEnRelation => {
        return conseillersService.find({ query: { _id: new ObjectID(miseEnRelation.conseiller.oid) } });
      };

      const getData = async () => {
        return Promise.all(misesEnRelation.data.map(miseEnRelation => findConseiller(miseEnRelation)));
      };

      getData().then(conseillers => {
        misesEnRelation.data = misesEnRelation.data.map((miseEnRelation, idx) => {
          let item = Object.assign(miseEnRelation, { conseiller: conseillers[idx].data[0] });
          delete item.structure;
          return item;
        });
        res.send(misesEnRelation);
      });
    });
  }
};
