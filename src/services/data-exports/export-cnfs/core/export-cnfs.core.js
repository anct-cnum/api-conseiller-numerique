const dayjs = require('dayjs');

const formatDate = dateFin => dayjs(new Date(dateFin)).format('DD/MM/YYYY');

const userActifStatus = (mattermost, emailCNError) => mattermost !== undefined && emailCNError !== undefined ? 'Oui' : 'Non';

const prettifyAndComplete = getStructureNameFromId => async statCnfs => {
  const { structureId, emailCNError, mattermost, ...nextStatCnfs } = statCnfs;

  return {
    ...nextStatCnfs,
    datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
    dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
    nomStructure: structureId ? (await getStructureNameFromId(structureId)).nom : '',
    certifie: 'Non',
    isUserActif: userActifStatus(mattermost, emailCNError)
  };
};

const getStatsCnfs = async (
  { dateDebut, dateFin, nomOrdre, ordre, certifie, isUserActif },
  { getStatsCnfs, getStructureNameFromId }) => {
  return Promise.all(
    (await getStatsCnfs(dateDebut, dateFin, nomOrdre, ordre, certifie, isUserActif)).map(prettifyAndComplete(getStructureNameFromId))
  );
};

module.exports = {
  getStatsCnfs
};
