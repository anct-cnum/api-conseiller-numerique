const users = require('./users/users.service.js');
const siret = require('./siret/siret.service.js');
const conseillers = require('./conseillers/conseillers.service.js');
const structures = require('./structures/structures.service.js');
const misesEnRelation = require('./mises-en-relation/misesEnRelation.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function(app) {
  app.configure(users);
  app.configure(siret);
  app.configure(conseillers);
  app.configure(structures);
  app.configure(misesEnRelation);
};
