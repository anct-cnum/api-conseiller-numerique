const OSM_DAYS_OF_WEEK = [
  'Mo',
  'Tu',
  'We',
  'Th',
  'Fr',
  'Sa',
  'Su'
];

const daysBetween = (startDayIndex, EndDayIndex) => OSM_DAYS_OF_WEEK.filter((_, index) => index > startDayIndex && index < EndDayIndex);

const ofDay = previousLastDay => day => day === previousLastDay;

const openingHoursDaysOffIfAny = newDaysOff => newDaysOff.length > 0 ? [{
  days: newDaysOff,
  osmHours: 'off'
}] : [];

const workingDays = currentOpeningHour => day => !currentOpeningHour.days.includes(day);

const daysOffToAdd = currentOpeningHour => daysBetween(
  OSM_DAYS_OF_WEEK.findIndex(ofDay(currentOpeningHour.days[0])),
  OSM_DAYS_OF_WEEK.findIndex(ofDay(currentOpeningHour.days.slice(-1)[0]))
).filter(workingDays(currentOpeningHour));

const isDaysRange = days => days.length > 2;

const getDaysOff = (currentOpeningHour, previousOpeningHoursDaysOff) => {
  if (isDaysRange(currentOpeningHour.days)) {
    return openingHoursDaysOffIfAny([
      ...(previousOpeningHoursDaysOff?.days.filter(workingDays(currentOpeningHour)) ?? []),
      ...daysOffToAdd(currentOpeningHour)
    ]);
  } else if (previousOpeningHoursDaysOff) {
    return openingHoursDaysOffIfAny(previousOpeningHoursDaysOff.days.filter(workingDays(currentOpeningHour)));
  }

  return [];
};

const withoutDaysOff = group => group.osmHours !== 'off';

const withDaysOff = group => group.osmHours === 'off';

const appendOffHours = (openingHoursGroupDaysByHours, currentOpeningHour) =>
  [
    ...openingHoursGroupDaysByHours.filter(withoutDaysOff),
    currentOpeningHour,
    ...getDaysOff(currentOpeningHour, openingHoursGroupDaysByHours.find(withDaysOff))
  ];

const appendToExistingOpeningHoursGroup = (existingOpeningHoursGroup, currentOpeningHour) => [
  {
    days: [...existingOpeningHoursGroup.days, currentOpeningHour.day],
    osmHours: currentOpeningHour.osmHours
  },
];

const newOpeningHoursGroup = currentOpeningHour => [
  {
    days: [currentOpeningHour.day],
    osmHours: currentOpeningHour.osmHours
  }
];

const updateOpeningHoursGroupDaysByHours = (existingOpeningHoursGroup, currentOpeningHour) =>
  (existingOpeningHoursGroup ?
    appendToExistingOpeningHoursGroup(existingOpeningHoursGroup, currentOpeningHour) :
    newOpeningHoursGroup(currentOpeningHour));

const updatingOpeningHoursGroups =
  currentOpeningHour =>
    openingHours =>
      openingHours.osmHours !== currentOpeningHour.osmHours && !openingHours.osmHours.includes('off');

const existingOpeningHoursGroupFor = currentOpeningHour => openingHours => openingHours.osmHours === currentOpeningHour.osmHours;

const formatDays = days => isDaysRange(days) ? [days[0], days[days.length - 1]].join('-') : days.join(',');

const toOSMOpeningHoursStrings = (osmOpeningHours, openingHours) => [
  ...osmOpeningHours, `${formatDays(openingHours.days)} ${openingHours.osmHours}`
];

const byDayOfWeek = (osmOpeningHours1, osmOpeningHours2) =>
  OSM_DAYS_OF_WEEK.findIndex(ofDay(osmOpeningHours1.days[0])) - OSM_DAYS_OF_WEEK.findIndex(ofDay(osmOpeningHours2.days[0]));

const byRange = (osmOpeningHours1, osmOpeningHours2) => osmOpeningHours2.days.length - osmOpeningHours1.days.length;

const groupOpeningHoursDaysByHours = (openingHoursGroupDaysByHours, currentOpeningHour) =>
  [
    ...openingHoursGroupDaysByHours.filter(updatingOpeningHoursGroups(currentOpeningHour)),
    ...updateOpeningHoursGroupDaysByHours(
      openingHoursGroupDaysByHours.find(existingOpeningHoursGroupFor(currentOpeningHour)),
      currentOpeningHour)
  ];

const toOsmOpeningHours = horaires => horaires
.reduce(groupOpeningHoursDaysByHours, [])
.sort(byDayOfWeek)
.sort(byRange)
.reduce(appendOffHours, [])
.reduce(toOSMOpeningHoursStrings, [])
.join(('; '))
.replace('Mo-Su ', '');

module.exports = {
  OSM_DAYS_OF_WEEK,
  toOsmOpeningHours,
};
