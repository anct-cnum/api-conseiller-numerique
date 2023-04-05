const { ObjectId } = require('mongodb');

const getConseillerAssociatedWithUser = db => async user =>
  await db.collection('conseillers').findOne({ _id: user.entity.oid });

const getConseiller = db => async conseillerSubordonne =>
  await db.collection('conseillers').findOne({ _id: new ObjectId(conseillerSubordonne) });

const getCoordinateur = db => async (user, conseillerSubordonne) => {
  let resultat = null;
  const conseiller = await db.collection('conseillers').findOne({ '_id': new ObjectId(conseillerSubordonne) });
  const coordinateur = await db.collection('conseillers').findOne(
    {
      '_id': user.entity.oid,
      'listeSubordonnes.type': {
        '$in': ['codeDepartement', 'codeRegion', 'conseillers']
      }
    });
  if (coordinateur) {
    switch (coordinateur.listeSubordonnes.type) {
      case 'codeDepartement':
        resultat = coordinateur.listeSubordonnes?.liste?.includes(conseiller?.codeDepartementStructure) ? coordinateur : null;
        break;
      case 'codeRegion':
        resultat = coordinateur.listeSubordonnes?.liste?.includes(conseiller?.codeRegionStructure) ? coordinateur : null;
        break;
      case 'conseillers':
        resultat = coordinateur.listeSubordonnes?.liste?.map(i => String(i))?.includes(conseillerSubordonne) ? coordinateur : null;
        break;
      default:
        break;
    }
  }
  return resultat;
};
const exportStatistiquesRepository = db => ({
  getConseillerAssociatedWithUser: getConseillerAssociatedWithUser(db),
  getConseiller: getConseiller(db),
  getCoordinateur: getCoordinateur(db)
});

module.exports = {
  exportStatistiquesRepository
};
