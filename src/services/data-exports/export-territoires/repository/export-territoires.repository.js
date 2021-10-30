const statsCras = require("../../../stats/cras");

const getStatsTerritoiresForRegion = async (db, dateFin) => await db.collection('stats_Territoires').aggregate(
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
      _id: 0, codeRegion: 1, nomRegion: 1, nombreConseillersCoselec: 1, cnfsActives: 1, cnfsInactives: 1,
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
).toArray();

const getStatsTerritoiresForDepartement = async (db, dateFin, nomOrdre, ordre) => await db.collection('stats_Territoires')
.find({
  'date': dateFin
})
.sort(JSON.parse('{"' + nomOrdre + '":' + ordre + '}'))
.toArray();

const geCountPersonnesAccompagnees = async (ligneStats, req, db) => await statsCras.getPersonnesAccompagnees(db, {
  'conseiller.$id': {
    $in: ligneStats.conseillerIds
  },
  'createdAt': {
    $gte: new Date(req.query.dateDebut),
    $lte: new Date(req.query.dateFin),
  }
});

module.exports = {
  getStatsTerritoiresForRegion,
  getStatsTerritoiresForDepartement,
  geCountPersonnesAccompagnees
};
