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

const getStatistiquesToExport = async (dateDebut, dateFin, conseillerId, type, exportStatistiquesRepository) =>
  isStatistiquesForConseiller(conseillerId) ?
    await statistiquesForConseiller(dateDebut, dateFin, conseillerId, exportStatistiquesRepository) :
    await statistiquesNationales(dateDebut, dateFin, type, exportStatistiquesRepository);

module.exports = {
  getStatistiquesToExport
};
