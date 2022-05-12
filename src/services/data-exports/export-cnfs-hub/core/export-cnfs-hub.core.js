const { findNumDepartementByRegion } = require('../utils/export-cnfs-hub.utils');

const getStatsCnfsHubs = async (hub, { getStructureAndConseillerByDepartement, getStructureAndConseillerByDepartementHubAntillesGuyane }) => {
  if (hub.region_names) {
    return Promise.all((await getStructureAndConseillerByDepartement(findNumDepartementByRegion(hub.region_names))));
  }
  if (hub.name === 'Hub Antilles-Guyane') {
    hub.departements.push('978');
    return Promise.all((await getStructureAndConseillerByDepartementHubAntillesGuyane(hub.departements)));
  }

  return Promise.all((await getStructureAndConseillerByDepartement(hub.departements)));
};

module.exports = {
  getStatsCnfsHubs
};
