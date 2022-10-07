const { NotFound } = require('@feathersjs/errors');
const { Service } = require('feathers-mongodb');
const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');

const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const { userIdFromRequestJwt } = require('../../common/utils/feathers.utils');
const statsCras = require('../stats/cras');

exports.HistoriqueCras = class HistoriqueCras extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('cras');
    });

    app.get('/historique-cras/liste', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const maxDate = new Date(dayjs().subtract(1, 'month'));
      const theme = req.query.theme !== 'null' ? req.query.theme : null;
      let query = {
        'conseiller.$id': new ObjectId(user.entity.oid),
        'createdAt': {
          '$gte': maxDate
        }
      };
      if (theme) {
        query = {
          'cra.themes': {
            '$in': [theme]
          },
          'conseiller.$id': new ObjectId(user.entity.oid),
          'createdAt': {
            '$gte': maxDate
          }
        };
      }
      try {
        const cras = await db.collection('cras').find(query).sort({ 'cra.dateAccompagnement': -1, 'createdAt': -1 }).toArray();
        if (cras.length === 0) {
          res.status(404).send(new NotFound('Aucun CRA').toJSON());
          return;
        }
        res.send({ cras });
      } catch (error) {
        console.log(error);
      }


    });

    app.get('/historique-cras/thematiques', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const maxDate = new Date(dayjs().subtract(1, 'month'));
      const query = {
        'conseiller.$id': new ObjectId(user.entity.oid),
        'createdAt': {
          '$gte': maxDate
        }
      };
      const listThemes = await statsCras.getStatsThemes(db, query);
      const themes = [];
      listThemes?.forEach(theme => {
        if (theme.valeur >= 1) {
          themes.push(theme.nom);
        }
      });
      res.send({ themes });
    });
  }
};

