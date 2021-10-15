const getStatsTotalParticipants = async stats => {

  let totalParticipants = stats.nbTotalParticipant + stats.nbAccompagnementPerso + stats.nbDemandePonctuel;

  return totalParticipants;

};

module.exports = { getStatsTotalParticipants };
