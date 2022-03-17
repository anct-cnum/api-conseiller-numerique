const axios = require('axios');

const getUrl = openCageData => `${openCageData.endPoint}?countrycode=${openCageData.countryCode}&limit=${openCageData.limit}`;

const toGeocodeTransfer = feature => ({
  geometry: feature.geometry,
  properties: {
    address: feature.properties.formatted
  }
});

const geocodeRepository = openCageData => async place =>
  (await axios.get(`${getUrl(openCageData)}&q=${encodeURI(place)}&key=${openCageData.token}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })).data.features.map(toGeocodeTransfer);

module.exports = {
  geocodeRepository
};
