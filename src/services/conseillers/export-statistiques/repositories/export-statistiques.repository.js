const { ObjectId } = require('mongodb');

const getConseillerAssociatedWithUser = db => async user =>
  await db.collection('conseillers').findOne({ _id: user.entity.oid });

const getConseiller = db => async userIdSubordonne =>
  await db.collection('conseillers').findOne({ _id: new ObjectId(userIdSubordonne) });

const getConseillerSubordonee = db => async (user, userIdSubordonne) =>
  await db.collection('conseillers').findOne({ '_id': user.entity.oid, 'listeSubordonnes.liste': { '$in': [new ObjectId(userIdSubordonne)] } });


const exportStatistiquesRepository = db => ({
  getConseillerAssociatedWithUser: getConseillerAssociatedWithUser(db),
  getConseiller: getConseiller(db),
  getConseillerSubordonee: getConseillerSubordonee(db)
});

module.exports = {
  exportStatistiquesRepository
};
