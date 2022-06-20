/* eslint-disable comma-spacing */
const { ObjectID } = require('mongodb');

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
const filterNom = nom => nom ? { nom: new RegExp(`^${nom}$`, 'i') } : {};
const filterStructureId = structureId => structureId ? { structureId: { $eq: new ObjectID(structureId) } } : {};

const filterCertification = certifie => {
  if (certifie === 'true') {
    return { certifie: { $eq: true } };
  } else if (certifie === 'false') {
    return { certifie: { $exists: false } };
  }

  return {};
};

const getCraCount = db => async conseiller => await db.collection('cras').countDocuments({ 'conseiller.$id': conseiller._id });

const countGetPersonnesAccompagnees = db => async (conseiller, dateDebut, dateFin) => await db.collection('cras').aggregate([
  { $match: { 'conseiller.$id': conseiller._id,
    '$and': [
      { 'cra.dateAccompagnement': { $gt: dateDebut } },
      { 'cra.dateAccompagnement': { $lt: dateFin } }
    ]
  } },
  { $group: { _id: null, count: { $sum: '$cra.nbParticipants' } } },
  { $project: { 'valeur': '$count' } }
]).toArray();

const getStatsCnfs = db => async (dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif, nom, structureId) => {
  const conseillers = db.collection('conseillers').aggregate([
    {
      $match: {
        statut: 'RECRUTE',
        $and: [
          { datePrisePoste: { $gt: dateDebut } },
          { datePrisePoste: { $lt: dateFin } },
        ],
        ...filterUserActif(isUserActif),
        ...filterGroupeCRA(groupeCRA),
        ...filterNom(nom),
        ...filterStructureId(structureId),
        ...filterCertification(certifie)
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
        'idPG': 1,
        'prenom': 1,
        'nom': 1,
        'email': 1,
        'emailCN': 1,
        'codePostal': 1,
        'codeDepartement': 1,
        'structureId': 1,
        'certifie': 1,
        'datePrisePoste': 1,
        'dateFinFormation': 1,
        'groupeCRA': 1,
        'groupeCRAHistorique': 1,
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
      const countGetPA = await countGetPersonnesAccompagnees(db)(conseiller, dateDebut, dateFin);
      conseiller.craCount = result;
      conseiller.countPersonnesAccompagnees = countGetPA[0]?.valeur ?? 0;
      arrayConseillers.push(conseiller);
    }
  };
  if (nomOrdre !== undefined && ordre !== undefined) {
    const ordreResult = await conseillers
    .sort({ [nomOrdre]: parseInt(ordre) })
    .toArray();
    await functionCraCount(db)(ordreResult, dateDebut, dateFin);
    return arrayConseillers;
  }
  await functionCraCount(db)(await conseillers.toArray());
  return arrayConseillers;
};

const getCnfsWithoutCRA = db => async () => await db.collection('conseillers').find({
  'groupeCRA': { $eq: 4 },
  'statut': { $eq: 'RECRUTE' },
  'groupeCRAHistorique': {
    $elemMatch: {
      'nbJourDansGroupe': { $exists: false },
      'mailSendConseillerM+1,5': true,
      'mailSendConseillerM+1': true
    }
  }
}).toArray();

const statsCnfsRepository = db => ({
  getStatsCnfs: getStatsCnfs(db),
  getCnfsWithoutCRA: getCnfsWithoutCRA(db)
});

module.exports = {
  statsCnfsRepository
};
