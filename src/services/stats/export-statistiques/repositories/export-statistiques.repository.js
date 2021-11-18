const { ObjectID } = require('mongodb');

const getConseillerById = db => async id => await db.collection('conseillers').findOne({ _id: new ObjectID(id) });

const exportStatistiquesRepository = db => ({
  getConseillerById: getConseillerById(db)
});

module.exports = {
  exportStatistiquesRepository
};
