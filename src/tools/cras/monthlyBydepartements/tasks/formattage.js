const getListDepsFormatted = async (departements, nouvelleColonne, statsDoms, statsStMartin, statsCorse2A, statsCorse2B, statsAllOthersDeps) => {

  const depsList = new Map();
  //Insertion des stats par département
  for (const departement of departements) {
    let statDep;
    //CAS DOMs
    // eslint-disable-next-line max-len
    if ((departement['num_dep'].toString().startsWith('97') || departement['num_dep'].toString().startsWith('98')) && !departement['num_dep'].toString().startsWith('97150')) {
      statDep = statsDoms?.find(stat => stat._id['departement'] === departement['num_dep'].toString());
    //CAS CORSE 2A
    } else if (departement['num_dep'].toString().startsWith('2A')) {
      statDep = statsCorse2A?.find(stat => stat._id['departement'] === departement['num_dep'].toString());
    //CAS CORSE 2B
    } else if (departement['num_dep'].toString().startsWith('2B')) {
      statDep = statsCorse2B?.find(stat => stat._id['departement'] === departement['num_dep'].toString());
    } else {
    //CAS NORMAL
      statDep = statsAllOthersDeps?.find(stat => stat._id['departement'] === departement['num_dep'].toString());
    }

    departement[nouvelleColonne] = statDep?.valeur ?? 0;
    depsList.set(String(departement.num_dep), departement);
  }

  //CAS TOMs (manuel car ne sont pas réellement des départements)
  let stMartin = {
    num_dep: 978,
    dep_name: 'Saint-Martin',
    region_name: 'Saint-Martin',
    [nouvelleColonne]: statsStMartin?.find(stat => stat._id['departement'] === '97150')?.valeur ?? 0
  };
  depsList.set(String(978), stMartin);

  let nouvelleCaledonie = {
    num_dep: 988,
    dep_name: 'Nouvelle-Calédonie',
    region_name: 'Nouvelle-Calédonie',
    [nouvelleColonne]: statsDoms?.find(stat => stat._id['departement'] === '988')?.valeur ?? 0
  };
  depsList.set(String(988), nouvelleCaledonie);

  return depsList;

};

module.exports = { getListDepsFormatted };
