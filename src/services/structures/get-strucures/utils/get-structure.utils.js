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

const isStructureDuplicate = structure =>
  hasDuplicateStatut(structure);

module.exports = {
  isStructureDuplicate
};
