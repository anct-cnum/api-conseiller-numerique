const departements = require('../../../../../data/imports/departements-region.json');
const departementLocations = require('../../../../../data/imports/departements-location.json');

const departementNotFound = 'departement not found';

const getDepartementName = conseillerByCodeDepartement =>
  departements.find(departement => departement.num_dep === conseillerByCodeDepartement._id)?.dep_name ?? departementNotFound;

const addDepartement = (curentConseillersByDepartements, departement, conseillerByCodeDepartement) =>
  [...curentConseillersByDepartements, { codeDepartement: conseillerByCodeDepartement._id, departement, count: conseillerByCodeDepartement.count }];

const nextConseillersByDepartements = (conseillerDepartement, curentConseillersByDepartements, conseillerByCodeDepartement) =>
  conseillerDepartement === departementNotFound ?
    curentConseillersByDepartements :
    addDepartement(curentConseillersByDepartements, conseillerDepartement, conseillerByCodeDepartement);

const getConseillersByDepartements = async getConseillersByCodeDepartement =>
  (await getConseillersByCodeDepartement())
  .reduce((curentConseillersByDepartements, conseillerByCodeDepartement) =>
    nextConseillersByDepartements(
      getDepartementName(conseillerByCodeDepartement),
      curentConseillersByDepartements,
      conseillerByCodeDepartement
    ), []);

const departementLocationProperties = departement =>
  departementLocations.find(departementLocation => departementLocation.num_dep === departement);

const toGeoJson = conseillersByDepartement => {
  const { geometry, boundingZoom } = departementLocationProperties(conseillersByDepartement.codeDepartement);

  return {
    type: 'Feature',
    geometry,
    properties: {
      codeDepartement: conseillersByDepartement.codeDepartement,
      nomDepartement: conseillersByDepartement.departement,
      boundingZoom,
      count: conseillersByDepartement.count
    }
  };
};

const geolocatedConseillersByDepartement = async ({ getConseillersByCodeDepartement }) => ({
  type: 'FeatureCollection',
  features: (await getConseillersByDepartements(getConseillersByCodeDepartement)).map(toGeoJson)
});

module.exports = {
  geolocatedConseillersByDepartement
};
