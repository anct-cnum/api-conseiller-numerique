const { ObjectID } = require('mongodb');

const getConseillerAssociatedWithUser = db => async user =>
  await db.collection('conseillers').findOne({ _id: new ObjectID(user.entity.oid) });


const exportStatistiquesRepository = db => ({
  getConseillerAssociatedWithUser: getConseillerAssociatedWithUser(db)
});

module.exports = {
  exportStatistiquesRepository
};
