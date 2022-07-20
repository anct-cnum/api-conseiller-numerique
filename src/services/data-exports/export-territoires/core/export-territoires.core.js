const Territoire = {
  Departement: 'codeDepartement',
  Region: 'codeRegion'
};

const countPersonnesAccompagnees = async (dateDebut, dateFin, conseillerIds, getPersonnesAccompagnees) => {
  if (conseillerIds.length === 0) {
    return 0;
  }

  const personnesAccompagnees = await getPersonnesAccompagnees(new Date(dateDebut), new Date(dateFin), conseillerIds);
  return personnesAccompagnees.length > 0 ? personnesAccompagnees[0]?.count : 0;
};

const getTauxActivation = (nombreConseillersCoselec, cnfsActives) => nombreConseillersCoselec ? Math.round(cnfsActives * 100 / nombreConseillersCoselec) : 0;

const formatDate = dateFin => new Intl.DateTimeFormat('fr-FR', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' }).format(dateFin);

const statsTerritoiresForDepartement = async (dateDebut, dateFin, statsTerritoires, getPersonnesAccompagnees) =>
  await Promise.all(
    statsTerritoires.map(
      async ligneStats =>
        ({
          ...ligneStats,
          personnesAccompagnees: await countPersonnesAccompagnees(dateDebut, dateFin, ligneStats.conseillerIds, getPersonnesAccompagnees)
        })
    )
  );

const statsTerritoiresForRegion = async (dateDebut, dateFin, statsTerritoires, getPersonnesAccompagnees) =>
  await Promise.all(
    statsTerritoires.map(
      async ligneStats => ({
        ...ligneStats,
        tauxActivation: getTauxActivation(ligneStats?.nombreConseillersCoselec, ligneStats?.cnfsActives),
        personnesAccompagnees: await countPersonnesAccompagnees(dateDebut, dateFin, ligneStats.conseillerIds.flat(), getPersonnesAccompagnees)
      })
    )
  );

const getStatsTerritoires = async (
  { territoire, nomOrdre, ordre, dateDebut, dateFin },
  { getStatsTerritoiresForDepartement, getStatsTerritoiresForRegion, getPersonnesAccompagnees }) => {
  if (territoire === Territoire.Departement) {
    const statsTerritoires = await getStatsTerritoiresForDepartement(formatDate(dateFin), nomOrdre, ordre);
    return await statsTerritoiresForDepartement(dateDebut, dateFin, statsTerritoires, getPersonnesAccompagnees);
  }

  if (territoire === Territoire.Region) {
    const statsTerritoires = await getStatsTerritoiresForRegion(formatDate(dateFin), nomOrdre, ordre);
    return await statsTerritoiresForRegion(dateDebut, dateFin, statsTerritoires, getPersonnesAccompagnees);
  }
};

module.exports = {
  getStatsTerritoires
};
