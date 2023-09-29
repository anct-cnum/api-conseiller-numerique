const { Service } = require('feathers-mongodb');
const { listeCoordinateurs, listeConseillers } = require('./core/coordinateurs.core');
const { getCoordinateurs, getStatsCoordination, getConseillers, getPermanences } = require('./repository/coordinateurs.repository');
const logger = require('../../logger');

exports.Coordinateurs = class Coordinateurs extends Service {
  constructor(options, app) {
    super(options);

    app.get('/coordinateurs', async (req, res) => {
      const db = await app.get('mongoClient');

      await listeCoordinateurs({
        getCoordinateurs: getCoordinateurs(db),
        getStatsCoordination: getStatsCoordination(db),
      }).then(coordinateurs => res.send(coordinateurs)).catch(error => {
        app.get('sentry').captureException(error);
        logger.error(error);
      });
    });

    app.get('/coordination-conseillers', async (req, res) => {
      const db = await app.get('mongoClient');

      await listeConseillers({
        getConseillers: getConseillers(db),
        getPermanences: getPermanences(db),
      }).then(conseillers => res.send(conseillers)).catch(error => {
        app.get('sentry').captureException(error);
        logger.error(error);
      });
    });

  }
};
