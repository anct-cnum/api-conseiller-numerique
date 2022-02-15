const isStatistiquesForConseiller = conseillerId => conseillerId !== undefined;

const conseillerFullName = async (getConseillerById, conseillerId) => {
  const conseiller = await getConseillerById(conseillerId);
  return `${conseiller.prenom} ${conseiller.nom}`;
};

const statistiquesForConseiller = async (dateDebut, dateFin, conseillerId, { getConseillerById, getStatsConseiller }) => ({
  stats: await getStatsConseiller(dateDebut, dateFin, conseillerId),
  type: await conseillerFullName(getConseillerById, conseillerId)
});

const statistiquesNationales = async (dateDebut, dateFin, type, { getStatsNationales }) => ({
  stats: await getStatsNationales(dateDebut, dateFin),
  type: type
});

const statistiquesDepartementalRegional = async (dateDebut, dateFin, idType, type, ids, { getStatsDepartementalRegional }) => ({
  stats: await getStatsDepartementalRegional(dateDebut, dateFin, ids),
  type: type,
  idType: idType
});

const getStatistiquesToExport = async (dateDebut, dateFin, conseillerId, idType, type, ids, exportStatistiquesRepository) => {
  if (isStatistiquesForConseiller(conseillerId)) {
    return await statistiquesForConseiller(dateDebut, dateFin, conseillerId, exportStatistiquesRepository);
  }
  if (type === 'nationales') {
    return await statistiquesNationales(dateDebut, dateFin, type, exportStatistiquesRepository);
  }
  // ici c'est forcément de type codedepartement ou codeRegion
  return await statistiquesDepartementalRegional(dateDebut, dateFin, idType, type, ids, exportStatistiquesRepository);
};

module.exports = {
  getStatistiquesToExport
};
