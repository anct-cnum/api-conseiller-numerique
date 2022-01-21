const { ObjectId } = require('mongodb');

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

const getCraCount = db => async conseiller => await db.collection('cras').countDocuments({ 'conseiller.$id': conseiller._id });

const getStatsCnfs = db => async (dateDebut, dateFin, nomOrdre, ordre, certifie, isUserActif) => {
  let conseillers = db.collection('conseillers').find({
    statut: 'RECRUTE',
    datePrisePoste: {
      $gt: dateDebut,
    },
    dateFinFormation: {
      $lt: dateFin,
    },
    ...filterUserActif(isUserActif)
  }).project({
    _id: 1,
    prenom: 1,
    nom: 1,
    email: 1,
    structureId: 1,
    codePostal: 1,
    datePrisePoste: 1,
    dateFinFormation: 1,
    emailCNError: 1,
    mattermost: 1,
  });
  const arrayConseillers = [];

  if (nomOrdre !== undefined && ordre !== undefined) {
    const ordreResult = conseillers
    .sort({ [nomOrdre]: parseInt(ordre) })
    .toArray();
    for (let conseiller of await ordreResult) {
      const result = await getCraCount(db)(conseiller);
      conseiller.craCount = result;
      arrayConseillers.push(conseiller);
    }
    return await arrayConseillers;
  }

  for (let conseiller of await conseillers.toArray()) {
    const result = await getCraCount(db)(conseiller);
    conseiller.craCount = result;
    arrayConseillers.push(conseiller);
  }

  return await arrayConseillers;
};

const getStructureNameFromId = db => async id => db.collection('structures')
.findOne({
  _id: new ObjectId(id)
}, {
  projection: {
    _id: 0,
    nom: 1
  }
});

const statsCnfsRepository = db => ({
  getStatsCnfs: getStatsCnfs(db),
  getStructureNameFromId: getStructureNameFromId(db),
});

module.exports = {
  statsCnfsRepository
};
