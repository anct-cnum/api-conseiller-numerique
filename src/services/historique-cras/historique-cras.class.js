const { NotFound } = require('@feathersjs/errors');
const { Service } = require('feathers-mongodb');
const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');

const { userAuthenticationRepository } = require('../../common/repositories/user-authentication.repository');
const { userIdFromRequestJwt } = require('../../common/utils/feathers.utils');
const statsCras = require('../stats/cras');
const logger = require('../../logger');

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
      const { theme, page } = req.query;

      let query = {
        'conseiller.$id': new ObjectId(user.entity.oid),
        'cra.dateAccompagnement': {
          '$gte': maxDate
        }
      };
      if (theme !== 'null') {
        query = { ...query, 'cra.themes': { '$in': [theme] } };
      }
      try {
        let items = {};
        const cras = await db.collection('cras').find(query).sort({ 'cra.dateAccompagnement': -1, 'createdAt': -1 })
        .skip(page > 0 ? ((page - 1) * 30) : 0).limit(30).toArray();

        if (cras.length === 0) {
          res.status(404).send(new NotFound('Aucun CRA').toJSON());
          return;
        }

        items.total = await db.collection('cras').countDocuments(query);
        items.data = cras;
        items.limit = 30;
        items.skip = page;

        res.send({ items: items });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
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
      try {
        const listThemes = await statsCras.getStatsThemes(db, query);
        const themes = [];
        listThemes?.forEach(theme => {
          if (theme.valeur >= 1) {
            themes.push(theme.nom);
          }
        });
        res.send({ themes });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
      }
    });
  }
};
