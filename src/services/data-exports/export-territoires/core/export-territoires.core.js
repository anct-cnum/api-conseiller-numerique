const dayjs = require('dayjs');

const statsTerritoiresForDepartement = async (nomOrdre, ordre, dateDebut, dateFin, { getStatsTerritoiresForDepartement, geCountPersonnesAccompagnees }) => {
  let promises = [];

  let statsTerritoires = await getStatsTerritoiresForDepartement(dayjs(new Date(dateFin)).format('DD/MM/YYYY'), nomOrdre, ordre);

  statsTerritoires.forEach(ligneStats => {
    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        let countAccompagnees = await geCountPersonnesAccompagnees(new Date(dateDebut), new Date(dateFin), ligneStats.conseillerIds);
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

const statsTerritoiresForRegion = async (dateDebut, dateFin, { getStatsTerritoiresForRegion, geCountPersonnesAccompagnees }) => {
  let promises = [];
  let statsTerritoires = await getStatsTerritoiresForRegion(dayjs(new Date(dateFin)).format('DD/MM/YYYY'));

  statsTerritoires.forEach(ligneStats => {
    ligneStats.tauxActivation = (ligneStats?.nombreConseillersCoselec) ? Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;
    ligneStats.personnesAccompagnees = 0;

    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        let countAccompagnees = await geCountPersonnesAccompagnees(new Date(dateDebut), new Date(dateFin), ligneStats.conseillerIds);
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

const getStatsTerritoires = async (
  { territoire, nomOrdre, ordre, dateDebut, dateFin },
  { getStatsTerritoiresForDepartement, getStatsTerritoiresForRegion, geCountPersonnesAccompagnees }) => {
  if (territoire === 'codeDepartement') {
    return await statsTerritoiresForDepartement(nomOrdre, ordre, dateDebut, dateFin, {
      getStatsTerritoiresForDepartement,
      geCountPersonnesAccompagnees
    });
  }

  if (territoire === 'codeRegion') {
    return await statsTerritoiresForRegion(dateDebut, dateFin, {
      getStatsTerritoiresForRegion,
      geCountPersonnesAccompagnees
    });
  }
};

module.exports = {
  getStatsTerritoires
};
