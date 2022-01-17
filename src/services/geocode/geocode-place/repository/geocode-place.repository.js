const axios = require('axios');

const getUrl = openCageData => `${openCageData.endPoint}?countrycode=${openCageData.countryCode}&limit=${openCageData.limit}`;

const toGeocodeTransfer = feature => ({
  geometry: feature.geometry,
  properties: {
    address: feature.properties.formatted
  }
});

const geocodeRepository = openCageData => async place =>
  (await axios.get(`${getUrl(openCageData)}&q=${place}&key=${openCageData.token}`)).data.features
  .map(toGeocodeTransfer)
;

module.exports = {
  geocodeRepository
};
