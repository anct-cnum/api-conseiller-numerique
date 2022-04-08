const { formatOpeningHours } = require('./format-opening-hours/format-opening-hours');
const { formatAddressFromInsee, formatAddressFromPermanence } = require('./format-address/format-address');

module.exports = {
  formatOpeningHours,
  formatAddressFromInsee,
  formatAddressFromPermanence
};
