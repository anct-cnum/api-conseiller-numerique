const { Service } = require('feathers-mongodb');
const { NotFound } = require('@feathersjs/errors');
const logger = require('../../logger');
const { canActivate, schemaGuard, abort } = require('../../common/utils/feathers.utils');
const { validatePlaceSchema } = require('./geocode-place/utils/geocode-place.utils');
const { geocodeRepository } = require('./geocode-place/repository/geocode-place.repository');

exports.Geocode = class Geocode extends Service {
  constructor(options, app) {
    super(options);

    app.get('/geocode/:place', async (req, res) => {
      const openCageData = app.get('open_cage_data');

      canActivate(
        schemaGuard(validatePlaceSchema(req.params))
      ).then(async () => {
        try {
          res.send(await geocodeRepository(openCageData)(req.params.place));
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);

          return res.status(404).send(new NotFound('Ce lieu n\'a pas été trouvé').toJSON());
        }
      }).catch(routeActivationError => abort(res, routeActivationError));
    });
  }
};
