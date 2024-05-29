
const getCoordinateurs = db => async () => await db.collection('conseillers').aggregate([
  {
    $match: {
      'statut': 'RECRUTE',
      'estCoordinateur': true,
      'nonAffichageCarto': { $ne: true },
      'listeSubordonnes.type': { $exists: true }
    },
  },
  {
    $lookup: {
      from: 'structures',
      let: { idStructure: '$structureId' },
      as: 'structure',
      pipeline: [
        {
          $match: { $expr: { $eq: ['$$idStructure', '$_id'] } },
        },
        {
          $project: {
            'nom': 1,
            'nomCommune': 1,
            'codeCommune': 1,
            'codePostal': 1,
            'insee.adresse': 1,
            'coordonneesInsee': 1,
            'location': 1,
          }
        }
      ]
    }
  },
  { $unwind: '$structure' },
  {
    $lookup: {
      from: 'permanences',
      let: { idConseiller: '$_id' },
      as: 'permanence',
      pipeline: [
        {
          $match: { $expr: { $in: ['$$idConseiller', '$lieuPrincipalPour'] } },
        },
        {
          $project: {
            adresse: 1,
            location: 1,
          }
        }
      ]
    }
  },
  {
    $unwind: {
      path: '$permanence',
      preserveNullAndEmptyArrays: true, // peut ne pas avoir rempli ses permanences
    },
  },
  {
    $project: {
      '_id': 1,
      'prenom': 1,
      'nom': 1,
      'permanence.adresse': 1,
      'structure.nomCommune': 1,
      'structure.nom': 1,
      'structure.codeCommune': 1,
      'structure.codePostal': 1,
      'structure.insee.adresse': 1,
      'emailPro': 1,
      'telephonePro': 1,
      'listeSubordonnes.type': 1,
      'listeSubordonnes.liste': 1,
      'permanence.location': 1,
      'structure.coordonneesInsee': 1,
      'structure.location': 1,
    }
  }
]).toArray();

const getStatsCoordination = db => async query =>
  await db.collection('conseillers').aggregate([
    {
      $match: query,
    },
    {
      $group: { '_id': null, 'countConseiller': { $sum: 1 }, 'uniqueStructureCount': { $addToSet: '$structureId' } }
    },
    {
      $project: {
        _id: 0,
        nbConseillers: '$countConseiller',
        nbStructures: '$uniqueStructureCount',
      }
    }
  ]).toArray();

const getConseillers = db => async () => await db.collection('conseillers').aggregate([
  {
    $match: {
      'statut': 'RECRUTE',
      'estCoordinateur': { $ne: true },
      'nonAffichageCarto': { $ne: true }
    },
  },
  {
    $lookup: {
      from: 'structures',
      let: { idStructure: '$structureId' },
      as: 'structure',
      pipeline: [
        {
          $match: { $expr: { $eq: ['$$idStructure', '$_id'] } },
        },
        {
          $project: {
            'nom': 1,
            'insee.adresse': 1,
            'coordonneesInsee': 1,
            'location': 1,
          }
        }
      ]
    }
  },
  { $unwind: '$structure' },
  {
    $project: {
      '_id': 1,
      'prenom': 1,
      'nom': 1,
      'emailPro': 1,
      'telephonePro': 1,
      'coordinateurs': 1,
      'structure.nom': 1,
      'structure.insee.adresse': 1,
      'structure.coordonneesInsee': 1,
      'structure.location': 1,
    }
  }
]).toArray();

const getPermanences = db => async id => await db.collection('permanences').aggregate([{
  $match: {
    $or: [
      { conseillers: { $in: [id] } },
      { conseillersItinerants: { $in: [id] } },
      { lieuPrincipalPour: { $in: [id] } }
    ]
  }
},
{
  $addFields: {
    estPrincipale: {
      $cond: [
        { $in: [id, '$lieuPrincipalPour'] },
        true,
        false
      ]
    }
  }
},
{
  $project: {
    _id: 1,
    nomEnseigne: 1,
    adresse: 1,
    location: 1,
    estPrincipale: 1
  }
}]).toArray();

const getIdStructures = db => async list => await db.collection('structures').distinct('_id', { 'codeCommune': { '$in': list } });

module.exports = {
  getCoordinateurs,
  getStatsCoordination,
  getConseillers,
  getPermanences,
  getIdStructures
};
