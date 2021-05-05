const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const utils = require('../../utils/index.js');

/* TODO:
- seul les admin doivent pouvoir tout faire
- les structures ne peuvent modifier que les donneés qui les concernent
- les conseillers ne peuvent lire les infos que sur la structure qui le concerne
*/
module.exports = {
  before: {
    all: authenticate('jwt'),
    find: [async context => {
      if (context.params.query.createdAt && context.params.query.createdAt.$gt) {
        context.params.query.createdAt.$gt = parseStringToDate(context.params.query.createdAt.$gt);
      }
      if (context.params.query.createdAt && context.params.query.createdAt.$lt) {
        context.params.query.createdAt.$lt = parseStringToDate(context.params.query.createdAt.$lt);
      }
    }, search()],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [async context => {
      Object.assign(context.result, { dernierCoselec: utils.getCoselec(context.result) });
      return context;
    }],
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
