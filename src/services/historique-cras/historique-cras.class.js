const { Service } = require('feathers-mongodb');
const { ObjectId } = require('mongodb');

const { GeneralError } = require('@feathersjs/errors');
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
      const { theme, canal, type, page } = req.query;
      let query = {
        'conseiller.$id': new ObjectId(user.entity.oid),
      };
      if (theme !== 'null') {
        query = { ...query, 'cra.themes': { '$in': [theme] } };
      }
      if (canal !== 'null') {
        query = { ...query, 'cra.canal': canal };
      }
      if (type !== 'null') {
        query = { ...query, 'cra.activite': type };
      }
      try {
        let items = {};
        const cras = await db.collection('cras').find(query).sort({ 'cra.dateAccompagnement': -1, 'createdAt': -1 })
        .skip(page > 0 ? ((page - 1) * 30) : 0).limit(30).toArray();

        items.total = await db.collection('cras').countDocuments(query);
        items.data = cras;
        items.limit = 30;
        items.skip = page;

        res.send({ items });
      } catch (error) {
        app.get('sentry').captureException(error);
        logger.error(error);
        return res.status(500).send(new GeneralError('Une erreur s\'est produite sur le chargement des cras, veuillez réessayer plus tard.').toJSON());
      }
    });

    app.get('/historique-cras/thematiques', async (req, res) => {
      const db = await app.get('mongoClient');
      const user = await userAuthenticationRepository(db)(userIdFromRequestJwt(req));
      const query = {
        'conseiller.$id': new ObjectId(user.entity.oid),
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
        return res.status(500).send(new GeneralError('Une erreur s\'est produite sur le chargement des thématiques, veuillez réessayer plus tard.').toJSON());
      }
    });
  }
};
