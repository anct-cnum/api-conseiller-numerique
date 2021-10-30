const dayjs = require('dayjs');
const {
  getStatsTerritoiresForRegion,
  getStatsTerritoiresForDepartement,
  geCountPersonnesAccompagnees
} = require('../repository/export-territoires.repository');

const statsTerritoiresForDepartement = async (db, req, nomOrdre, ordre) => {
  let promises = [];

  let statsTerritoires = await getStatsTerritoiresForDepartement(db, dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY'), nomOrdre, ordre);

  statsTerritoires.forEach(ligneStats => {
    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        let countAccompagnees = await geCountPersonnesAccompagnees(ligneStats, req, db);
        ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;

        resolve();
      }));
    } else {
      ligneStats.personnesAccompagnees = 0;
    }
  });

  await Promise.all(promises);

  return statsTerritoires;
};

async function statsTerritoiresForRegion(db, req) {
  let promises = [];

  let statsTerritoires = await getStatsTerritoiresForRegion(db, dayjs(new Date(req.query.dateFin)).format('DD/MM/YYYY'));

  statsTerritoires.forEach(ligneStats => {
    ligneStats.tauxActivation = (ligneStats?.nombreConseillersCoselec) ? Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;
    ligneStats.personnesAccompagnees = 0;

    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        let countAccompagnees = await geCountPersonnesAccompagnees(ligneStats, req, db);
        ligneStats.personnesAccompagnees = countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;

        resolve();
      }));
    } else {
      ligneStats.personnesAccompagnees = 0;
    }
  });

  await Promise.all(promises);

  return statsTerritoires;
}

module.exports = {
  statsTerritoiresForDepartement,
  statsTerritoiresForRegion
};
