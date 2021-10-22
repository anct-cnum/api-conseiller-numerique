const departements = require('../../data/imports/departements-region.json');

const findDepartement = numDept => {
  return departements.find(departement => `${departement.num_dep}` === numDept);
};

module.exports = { findDepartement };
