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
const filterNom = nom => nom ? { '$text': { $search: `"${nom}"` } } : {};
const filterStructureId = structureId => structureId ? { structureId: { $eq: new ObjectID(structureId) } } : {};
const filterCodeRegion = codeRegion => codeRegion ? { 'structure.codeRegion': codeRegion } : {};

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
      { 'cra.dateAccompagnement': { $gte: dateDebut } },
      { 'cra.dateAccompagnement': { $lte: dateFin } }
    ]
  } },
  { $group: { _id: null, count: { $sum: '$cra.nbParticipants' } } },
  { $project: { 'valeur': '$count' } }
]).toArray();

const getStatsCnfs = db => async (dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif, nom, structureId, codeRegion) => {
  const conseillers = db.collection('conseillers').aggregate([
    {
      $match: {
        statut: 'RECRUTE',
        $or: [
          { datePrisePoste: { $gte: dateDebut, $lte: dateFin } },
          { datePrisePoste: null },
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
      $match: {
        ...filterCodeRegion(codeRegion)
      }
    },
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
        'structure._id': 1,
        'structure.idPG': 1,
        'structure.contact.email': 1,
        'structure.contact.telephone': 1,
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
const getCnfsWithoutCRA = db => async dateMoins15jours => await db.collection('conseillers').aggregate([
  {
    $match: {
      'statut': { $eq: 'RECRUTE' },
      'estCoordinateur': { $ne: true },
      'groupeCRAHistorique': {
        $elemMatch: {
          'nbJourDansGroupe': { $exists: false },
          'mailSendConseillerM+1,5': true,
          'dateMailSendConseillerM+1,5': { $lte: dateMoins15jours },
          'mailSendConseillerM+1': true
        }
      }
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
      'prenom': 1,
      'nom': 1,
      'emailCN': 1,
      'codePostal': 1,
      'codeDepartement': 1,
      'telephone': 1,
      'groupeCRAHistorique': 1,
      'structure.idPG': 1,
      'structure.siret': 1,
      'structure.nom': 1,
      'structure.codePostal': 1,
    }
  }
]).toArray();

const statsCnfsRepository = db => ({
  getStatsCnfs: getStatsCnfs(db),
  getCnfsWithoutCRA: getCnfsWithoutCRA(db)
});

module.exports = {
  statsCnfsRepository
};
