const dayjs = require('dayjs');

const formatDate = dateFin => dayjs(new Date(dateFin)).format('DD/MM/YYYY');

const userActifStatus = mattermost => mattermost?.error === false ? 'Oui' : 'Non';

const prettifyAndComplete = () => async statCnfs => {
  const { mattermost, certifie, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
    dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
    isUserActif: userActifStatus(mattermost),
    certifie: certifie === true ? 'Oui' : 'Non',
  };
};

const getStatsCnfsCoordinateur = async (
  { dateDebut, dateFin, nomOrdre, ordre, isUserActif, user },
  { getStatsCnfsCoordinateur }) => {
  return Promise.all(
    (await getStatsCnfsCoordinateur(dateDebut, dateFin, nomOrdre, ordre, isUserActif, user)).map(prettifyAndComplete())
  );
};

module.exports = {
  getStatsCnfsCoordinateur
};
