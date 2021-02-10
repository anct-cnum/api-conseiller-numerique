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

      const structureCount = await this.find({
        query: {
          _id: structureId,
          $limit: 0,
        }
      });
      if (structureCount.total === 0) {
        res.status(404).send(new NotFound('Structure not found', {
          structureId
        }).toJSON());
        return;
      }

      let queryFilter = {};
      const { filter } = req.query;
      if (filter) {
        const allowedFilters = ['nouvelle', 'acceptee', 'refusee', 'retenue', 'toutes'];
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
