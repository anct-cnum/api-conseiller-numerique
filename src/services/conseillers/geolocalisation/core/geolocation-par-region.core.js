const departements = require('../../../../../data/imports/departements-region.json');
const regionLocations = require('../../../../../data/imports/regions-location.json');

const regionNotFound = 'region not found';

const removeRegionFromConseillersByRegions = (conseillersByRegions, region) =>
  conseillersByRegions.filter(conseillersByRegion => conseillersByRegion.region !== region);

const findConseillersByRegion = (conseillersByRegions, region) =>
  conseillersByRegions.find(conseillersByRegion => conseillersByRegion.region === region);

const conseillersCountInRegion = (conseillersByRegions, region) =>
  findConseillersByRegion(conseillersByRegions, region)?.count ?? 0;

const updateRegionFromConseillersByRegions = (conseillersByRegions, region, conseillerByCodeDepartement) => ({
  region,
  count: conseillersCountInRegion(conseillersByRegions, region) + conseillerByCodeDepartement.count
});

const updateConseillersByRegions = (conseillersByRegions, region, conseillerByCodeDepartement) => [
  ...(removeRegionFromConseillersByRegions(conseillersByRegions, region)),
  updateRegionFromConseillersByRegions(conseillersByRegions, region, conseillerByCodeDepartement)
];

const nextConseillersByRegions = (conseillerRegion, curentConseillersByRegions, conseillerByCodeDepartement) =>
  conseillerRegion === regionNotFound ?
    curentConseillersByRegions :
    updateConseillersByRegions(curentConseillersByRegions, conseillerRegion, conseillerByCodeDepartement);

const getRegionName = conseillerByCodeDepartement =>
  departements.find(departement => departement.num_dep === conseillerByCodeDepartement._id)?.region_name ?? regionNotFound;

const getConseillersByRegions = async getConseillersByCodeDepartement =>
  (await getConseillersByCodeDepartement())
  .reduce((curentConseillersByRegions, conseillerByCodeDepartement) =>
    nextConseillersByRegions(
      getRegionName(conseillerByCodeDepartement),
      curentConseillersByRegions,
      conseillerByCodeDepartement
    ), []);

const regionGeometry = region =>
  regionLocations.find(regionLocation => regionLocation.region_name === region).geometry;

const toGeoJson = conseillersByRegion => ({
  type: 'Feature',
  geometry: regionGeometry(conseillersByRegion.region),
  properties: {
    region: conseillersByRegion.region,
    count: conseillersByRegion.count
  }
});

const geolocatedConseillersByRegion = async ({ getConseillersByCodeDepartement }) => ({
  type: 'FeatureCollection',
  features: (await getConseillersByRegions(getConseillersByCodeDepartement)).map(toGeoJson)
});

module.exports = {
  geolocatedConseillersByRegion
};
