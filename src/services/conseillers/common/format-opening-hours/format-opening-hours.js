const notClosedOpeningHour = hour => hour !== 'Fermé';

const notEmptyString = value => value !== '';

const timeSeparator = ' - ';
const rangeSeparator = ' | ';
const hourSymbol = ':';
const hourUnit = 'h';

const DayPart = {
  Opening: 0,
  Closing: 1
};

const isNonStop = openingHour =>
  openingHour.matin[DayPart.Opening] !== 'Fermé' &&
  openingHour.matin[DayPart.Closing] === 'Fermé' &&
  openingHour.apresMidi[DayPart.Opening] === 'Fermé' &&
  openingHour.apresMidi[DayPart.Closing] !== 'Fermé';

const nonStopHours = openingHour => [
  openingHour.matin[DayPart.Opening], openingHour.apresMidi[DayPart.Closing]
];

const getOpeningHoursRanges = openingHour =>
  isNonStop(openingHour) ?
    [
      nonStopHours(openingHour).join(timeSeparator)
    ] :
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
