const { ObjectId } = require('mongodb');

const getConseillerAssociatedWithUser = db => async user =>
  await db.collection('conseillers').findOne({ _id: user.entity.oid });

const getConseiller = db => async conseillerSubordonne =>
  await db.collection('conseillers').findOne({ _id: new ObjectId(conseillerSubordonne) });

const getCoordinateur = db => async (user, conseillerSubordonne) =>
  await db.collection('conseillers').findOne({ '_id': user.entity.oid, 'listeSubordonnes.liste': { '$in': [new ObjectId(conseillerSubordonne)] } });

const exportStatistiquesRepository = db => ({
  getConseillerAssociatedWithUser: getConseillerAssociatedWithUser(db),
  getConseiller: getConseiller(db),
  getCoordinateur: getCoordinateur(db)
});

module.exports = {
  exportStatistiquesRepository
};
