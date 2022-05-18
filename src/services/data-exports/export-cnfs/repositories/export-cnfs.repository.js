function filterUserActif(isUserActif) {
  if (isUserActif === 'true') {
    return {
      emailCNError: { $ne: null },
      mattermost: { $ne: null }
    };
  } else if (isUserActif === 'false') {
    return {
      emailCNError: null,
      mattermost: null
    };
  }

  return {};
}

function filterGroupeCRA(groupeCRA) {
  if (groupeCRA) {
    return {
      groupeCRA: { $eq: parseInt(groupeCRA) }
    };
  }
  return {};
}
const getCraCount = db => async conseiller => await db.collection('cras').countDocuments({ 'conseiller.$id': conseiller._id });

const getStatsCnfs = db => async (dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif) => {
  const conseillers = db.collection('conseillers').aggregate([
    {
      $match: {
        statut: 'RECRUTE',
        $and: [
          { datePrisePoste: { $gt: dateDebut } },
          { datePrisePoste: { $lt: dateFin } },
        ],
        ...filterUserActif(isUserActif),
        ...filterGroupeCRA(groupeCRA)
      }
    },
    {
      $lookup: {
        localField: 'structureId',
        from: 'structures',
        foreignField: '_id',
        as: 'structure'
      }
    },
    { $unwind: '$structure' },
    {
      $project: {
        '_id': 1,
        'prenom': 1,
        'nom': 1,
        'email': 1,
        'emailCN': 1,
        'codePostal': 1,
        'structureId': 1,
        'datePrisePoste': 1,
        'dateFinFormation': 1,
        'groupeCRA': 1,
        'groupeCRAHistorique': { $slice: ['$groupeCRAHistorique', 3] },
        'emailCNError': 1,
        'mattermost': 1,
        'supHierarchique': 1,
        'structure.idPG': 1,
        'structure.contact.email': 1,
        'structure.nom': 1,
        'structure.insee': 1,
        'structure.codeDepartement': 1,
      }
    }
  ]);
  let arrayConseillers = [];
  const functionCraCount = db => async conseillers => {
    for (let conseiller of conseillers) {
      const result = await getCraCount(db)(conseiller);
      conseiller.craCount = result;
      arrayConseillers.push(conseiller);
    }
  };
  if (nomOrdre !== undefined && ordre !== undefined) {
    const ordreResult = await conseillers
    .sort({ [nomOrdre]: parseInt(ordre) })
    .toArray();
    await functionCraCount(db)(ordreResult);
    return arrayConseillers;
  }
  await functionCraCount(db)(await conseillers.toArray());
  return arrayConseillers;
};

const statsCnfsRepository = db => ({
  getStatsCnfs: getStatsCnfs(db)
});

module.exports = {
  statsCnfsRepository
};
