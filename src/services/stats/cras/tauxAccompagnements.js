const getStatsTauxAccompagnements = async (stats, totalParticipants) => {

  let tauxTotalUsagersAccompagnes = totalParticipants > 0 ? ~~(stats.nbUsagersBeneficiantSuivi / totalParticipants * 100) : 0;

  return tauxTotalUsagersAccompagnes;

};

module.exports = { getStatsTauxAccompagnements };
