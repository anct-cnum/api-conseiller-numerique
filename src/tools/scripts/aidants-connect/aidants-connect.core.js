const findCommonSiret = (siretList1, siretList2) =>
  siretList1.filter(siret => siretList2.includes(siret));

module.exports = {
  findCommonSiret
};
