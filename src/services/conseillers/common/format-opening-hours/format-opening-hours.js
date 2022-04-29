const notClosedOpeningHour = hour => hour !== 'Fermé';

const notEmptyString = value => value !== '';

const timeSeparator = ' - ';
const rangeSeparator = ' | ';
const hourSymbol = ':';
const hourUnit = 'h';

const getOpeningHoursRanges = openingHour =>
  [
    openingHour.matin.filter(notClosedOpeningHour).join(timeSeparator),
    openingHour.apresMidi.filter(notClosedOpeningHour).join(timeSeparator),
  ];

const formatOpeningHours = openingHours =>
  openingHours.map(openingHour =>
    getOpeningHoursRanges(openingHour)
    .filter(notEmptyString)
    .join(rangeSeparator)
    .replaceAll(hourSymbol, hourUnit));

module.exports = {
  formatOpeningHours
};
