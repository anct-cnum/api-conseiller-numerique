const indexes = require('./mongoIndexes');

module.exports = async db => {
  return Promise.all(
    Object.keys(indexes)
    .map(collection => indexes[collection](db))
  );
};
