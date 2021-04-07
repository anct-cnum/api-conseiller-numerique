const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');

/* TODO:
- seul les admin doivent pouvoir tout faire
- les structures ne peuvent modifier que les donneés qui les concernent
- les conseillers ne peuvent lire les infos que sur la mise en relation qui le concerne
*/
module.exports = {
  before: {
    all: authenticate('jwt'),
    find: [search()],
    get: [],
    create: [],
    update: [
      context => {
        context.data.dateRecrutement = parseStringToDate(context.data.dateRecrutement);
        return context;
      }
    ],
    patch: [
      context => {
        context.data.dateRecrutement = parseStringToDate(context.data.dateRecrutement);
        return context;
      }
    ],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};

//Parse string to date
function parseStringToDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date;
}
