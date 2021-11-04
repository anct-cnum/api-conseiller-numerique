const dayjs = require('dayjs');

const statsTerritoiresForDepartement = async (nomOrdre, ordre, dateDebut, dateFin, { getStatsTerritoiresForDepartement, getPersonnesAccompagnees }) => {
  let promises = [];
  let statsTerritoires = await getStatsTerritoiresForDepartement(dayjs(new Date(dateFin)).format('DD/MM/YYYY'), nomOrdre, ordre);

  statsTerritoires.forEach(ligneStats => {
    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        const personnesAccompagnees = await getPersonnesAccompagnees(new Date(dateDebut), new Date(dateFin), ligneStats.conseillerIds);
        ligneStats.personnesAccompagnees = personnesAccompagnees.length > 0 ? personnesAccompagnees[0]?.count : 0;
        resolve();
      }));
    } else {
      ligneStats.personnesAccompagnees = 0;
    }
  });

  await Promise.all(promises);

  return statsTerritoires;
};

const statsTerritoiresForRegion = async (nomOrdre, ordre, dateDebut, dateFin, { getStatsTerritoiresForRegion, getPersonnesAccompagnees }) => {
  let promises = [];
  let statsTerritoires = await getStatsTerritoiresForRegion(dayjs(new Date(dateFin)).format('DD/MM/YYYY'), nomOrdre, ordre);

  statsTerritoires.forEach(ligneStats => {
    ligneStats.tauxActivation = (ligneStats?.nombreConseillersCoselec) ? Math.round(ligneStats?.cnfsActives * 100 / (ligneStats?.nombreConseillersCoselec)) : 0;

    ligneStats.personnesAccompagnees = 0;
    if (ligneStats.conseillerIds.length > 0) {
      promises.push(new Promise(async resolve => {
        const personnesAccompagnees = await getPersonnesAccompagnees(new Date(dateDebut), new Date(dateFin), ligneStats.conseillerIds.flat());
        ligneStats.personnesAccompagnees = personnesAccompagnees.length > 0 ? personnesAccompagnees[0]?.count : 0;
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
  { getStatsTerritoiresForDepartement, getStatsTerritoiresForRegion, getPersonnesAccompagnees }) => {
  if (territoire === 'codeDepartement') {
    return await statsTerritoiresForDepartement(nomOrdre, ordre, dateDebut, dateFin, {
      getStatsTerritoiresForDepartement,
      getPersonnesAccompagnees
    });
  }

  if (territoire === 'codeRegion') {
    return await statsTerritoiresForRegion(nomOrdre, ordre, dateDebut, dateFin, {
      getStatsTerritoiresForRegion,
      getPersonnesAccompagnees
    });
  }
};

module.exports = {
  getStatsTerritoires
};
