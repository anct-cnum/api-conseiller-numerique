const isStatistiquesForConseiller = conseillerId => conseillerId !== undefined;

const conseillerFullName = async (getConseillerById, conseillerId) => {
  const conseiller = await getConseillerById(conseillerId);
  return `${conseiller.prenom} ${conseiller.nom}`;
};

const statistiquesForConseiller = async (dateDebut, dateFin, conseillerId, { getConseillerById, getStatsConseiller }, isAdminCoop) => ({
  stats: await getStatsConseiller(dateDebut, dateFin, conseillerId, isAdminCoop),
  type: await conseillerFullName(getConseillerById, conseillerId, isAdminCoop)
});

const statistiquesNationales = async (dateDebut, dateFin, type, { getStatsNationales }, isAdminCoop) => ({
  stats: await getStatsNationales(dateDebut, dateFin, isAdminCoop),
  type
});

const statistiquesDepartementalRegional = async (dateDebut, dateFin, idType, type, ids, { getStatsDepartementalRegional }, isAdminCoop) => ({
  stats: await getStatsDepartementalRegional(dateDebut, dateFin, ids, isAdminCoop),
  type,
  idType
});

const getStatistiquesToExport = async (
  dateDebut,
  dateFin,
  idType,
  type,
  ids,
  { getConseillerById, getStatsConseiller, getStatsNationales, getStatsDepartementalRegional },
  isAdminCoop) => {
  if (type === 'user' && isStatistiquesForConseiller(idType)) {
    return await statistiquesForConseiller(dateDebut, dateFin, idType, { getConseillerById, getStatsConseiller }, isAdminCoop);
  }
  if (type === 'nationales') {
    return await statistiquesNationales(dateDebut, dateFin, type, { getStatsNationales }, isAdminCoop);
  }
  // ici c'est forcément de type codedepartement ou codeRegion
  return await statistiquesDepartementalRegional(dateDebut, dateFin, idType, type, ids, { getStatsDepartementalRegional }, isAdminCoop);
};

module.exports = {
  getStatistiquesToExport
};
