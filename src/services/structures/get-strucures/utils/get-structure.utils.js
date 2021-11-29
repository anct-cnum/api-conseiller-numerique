const doublon = 'DOUBLON';
const regexpFirstMatchIndex = 1;
const captureCoselecNumberRegexp = /\/coselec (\d+)\//;
const latest = -1;

const hasDuplicateStatut = structure =>
  structure.statut === doublon;

const getCoselecNumber = prefet =>
  Number(prefet.fichier.match(captureCoselecNumberRegexp)[regexpFirstMatchIndex]);

const byCoselecNumber = (prefetA, prefetB) =>
  getCoselecNumber(prefetA) - getCoselecNumber(prefetB);

const hasDuplicateAvisPrefet = structure =>
  structure.prefet
  ?.sort(byCoselecNumber)
  .slice(latest)[0]
  ?.avisPrefet === doublon;

const isStructureDuplicate = structure =>
  hasDuplicateStatut(structure) || hasDuplicateAvisPrefet(structure);

module.exports = {
  isStructureDuplicate
};
