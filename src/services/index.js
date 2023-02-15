const users = require('./users/users.service.js');
const siret = require('./siret/siret.service.js');
const conseillers = require('./conseillers/conseillers.service.js');
const structures = require('./structures/structures.service.js');
const misesEnRelation = require('./mises-en-relation/misesEnRelation.service.js');
const stats = require('./stats/stats.service.js');
const dataExports = require('./data-exports/data-exports.service.js');
const cras = require('./cras/cras.service.js');
const sondages = require('./sondages/sondages.service.js');
const permanenceConseillers = require('./permanence-conseillers/permanence-conseillers.service.js');
const geocode = require('./geocode/geocode.service.js');
const historiqueCras = require('./historique-cras/historique-cras.service.js');
const logs = require('./logs/logs.service.js');

module.exports = function(app) {
  app.configure(users);
  app.configure(siret);
  app.configure(conseillers);
  app.configure(structures);
  app.configure(misesEnRelation);
  app.configure(stats);
  app.configure(dataExports);
  app.configure(cras);
  app.configure(sondages);
  app.configure(permanenceConseillers);
  app.configure(geocode);
  app.configure(historiqueCras);
  app.configure(logs);
};
