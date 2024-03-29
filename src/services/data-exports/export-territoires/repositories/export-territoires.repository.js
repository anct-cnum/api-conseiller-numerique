const statsCras = require('../../../stats/cras');

const getStatsTerritoiresForRegion = db => async (dateFin, nomOrdre, ordre) =>
  await db.collection('stats_Territoires').aggregate(
    {
      $match: {
        date: dateFin
      }
    },
    {
      $group: {
        _id: {
          codeRegion: '$codeRegion',
          nomRegion: '$nomRegion',
        },
        nombreConseillersCoselec: {
          $sum: '$nombreConseillersCoselec'
        },
        cnfsActives: {
          $sum: '$cnfsActives'
        },
        cnfsInactives: {
          $sum: '$cnfsInactives'
        },
        conseillerIds: {
          $push: '$conseillerIds'
        }
      }
    },
    {
      $addFields: {
        'codeRegion': '$_id.codeRegion',
        'nomRegion': '$_id.nomRegion'
      }
    },
    {
      $project: {
        _id: 0,
        codeRegion: 1,
        nomRegion: 1,
        nombreConseillersCoselec: 1,
        cnfsActives: 1,
        cnfsInactives: 1,
        conseillerIds: {
          $reduce: {
            input: '$conseillerIds',
            initialValue: [],
            in: {
              $concatArrays: ['$$value', '$$this']
            }
          }
        }
      }
    }
  )
  .sort({ [nomOrdre]: parseInt(ordre) })
  .toArray();

const getStatsTerritoiresForDepartement = db => async (dateFin, nomOrdre, ordre) => await db.collection('stats_Territoires')
.find({
  date: dateFin
})
.sort({ [nomOrdre]: parseInt(ordre) })
.toArray();

const getPersonnesAccompagnees = db => async (dateDebut, dateFin, conseillerIds) => await statsCras.getPersonnesAccompagnees(db, {
  'conseiller.$id': {
    $in: conseillerIds
  },
  'cra.dateAccompagnement': {
    $gte: dateDebut,
    $lte: dateFin,
  }
});

const statsTerritoiresRepository = db => ({
  getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartement(db),
  getStatsTerritoiresForRegion: getStatsTerritoiresForRegion(db),
  getPersonnesAccompagnees: getPersonnesAccompagnees(db)
});

module.exports = {
  statsTerritoiresRepository
};
