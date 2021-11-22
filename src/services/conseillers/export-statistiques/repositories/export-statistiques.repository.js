const getConseillerAssociatedWithUser = db => async user =>
  await db.collection('conseillers').findOne({ _id: user.entity.oid });

const exportStatistiquesRepository = db => ({
  getConseillerAssociatedWithUser: getConseillerAssociatedWithUser(db)
});

module.exports = {
  exportStatistiquesRepository
};
