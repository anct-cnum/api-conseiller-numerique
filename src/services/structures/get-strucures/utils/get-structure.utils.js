const doublon = 'DOUBLON';

const hasDuplicateStatut = structure =>
  structure.statut === doublon;

const isStructureDuplicate = structure =>
  hasDuplicateStatut(structure);

module.exports = {
  isStructureDuplicate
};
