const { ObjectID } = require('mongodb');

function filterUserActif(isUserActif) {
  if (isUserActif === 'true') {
    return {
      'mattermost.id': { $exists: true }
    };
  } else if (isUserActif === 'false') {
    return {
      'mattermost.id': { $exists: false }
    };
  }

  return {};
}

function filterByTypeCoordinateur(coordinateur) {
  let typeCoordo = '';
  switch (coordinateur?.listeSubordonnes?.type) {
    case 'codeRegion':
      typeCoordo = '_id';
      break;
    case 'codeDepartement':
      typeCoordo = 'codeDepartementStructure';
      break;
    default:
      typeCoordo = '_id';
  }

  return { [typeCoordo]: { '$in': coordinateur?.listeSubordonnes?.liste ?? [] } };
}

const getStructureNameFromId = db => async id => {
  const structure = await db.collection('structures').findOne({ _id: new ObjectID(id) }, { projection: { _id: 0, nom: 1 } });
  return structure.nom;
};

const getCraCount = db => async conseiller => await db.collection('cras').countDocuments({ 'conseiller.$id': conseiller._id });

const getStatsCnfsCoordinateur = db => async (dateDebut, dateFin, nomOrdre, ordre, isUserActif, user) => {

  const coordinateur = await db.collection('conseillers').findOne({ _id: user.entity.oid });

  const conseillers = db.collection('conseillers').find({
    statut: 'RECRUTE',
    $or: [
      { datePrisePoste: { '$gte': dateDebut, '$lte': dateFin } },
      { datePrisePoste: null }
    ],
    ...filterUserActif(isUserActif),
    ...filterByTypeCoordinateur(coordinateur)
  }).project({
    _id: 1,
    prenom: 1,
    nom: 1,
    email: 1,
    emailCN: 1,
    structureId: 1,
    codePostal: 1,
    datePrisePoste: 1,
    dateFinFormation: 1,
    emailCNError: 1,
    mattermost: 1,
    codeDepartement: 1,
    codeRegion: 1,
    certifie: 1
  });
  let arrayConseillers = [];

  const functionCraCount = db => async conseillers => {
    for (let conseiller of conseillers) {
      const result = await getCraCount(db)(conseiller);
      conseiller.craCount = result;

      arrayConseillers.push(conseiller);
    }
  };

  const functionStructureName = db => async conseillers => {
    for (let conseiller of conseillers) {
      const nomStructure = await getStructureNameFromId(db)(conseiller.structureId);
      conseiller.nomStructure = nomStructure;
    }
  };

  if (nomOrdre !== undefined && ordre !== undefined) {
    const ordreResult = await conseillers
    .sort({ [nomOrdre]: parseInt(ordre) })
    .toArray();

    await functionCraCount(db)(ordreResult);
    await functionStructureName(db)(ordreResult);
    return arrayConseillers;
  }

  await functionCraCount(db)(await conseillers.toArray());
  await functionStructureName(db)(await conseillers.toArray());
  return arrayConseillers;
};


const exportCnfsCoordinateurRepository = db => ({
  getStatsCnfsCoordinateur: getStatsCnfsCoordinateur(db)
});

module.exports = {
  exportCnfsCoordinateurRepository,
};
