const { findNumDepartementsByRegion } = require('../utils/export-cnfs-hub.utils');

const getStatsCnfsHubs = async (hub, { getStructureAndConseillerByDepartement, getStructureAndConseillerByDepartementHubAntillesGuyane }) => {
  if (hub.region_names) {
    return Promise.all((await getStructureAndConseillerByDepartement(findNumDepartementsByRegion(hub.region_names))));
  }
  if (hub.name === 'Hub Antilles-Guyane') {
    return Promise.all((await getStructureAndConseillerByDepartementHubAntillesGuyane(hub.departements)));
  }

  return Promise.all((await getStructureAndConseillerByDepartement(hub.departements)));
};

module.exports = {
  getStatsCnfsHubs
};
