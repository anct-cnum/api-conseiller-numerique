const dayjs = require('dayjs');
const formatDate = date => dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');

const userActifStatus = mattermost => mattermost?.error === false ? 'Oui' : 'Non';

const prettifyAndComplete = () => async statCnfs => {
  const { mattermost, certifie, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    datePrisePoste: nextStatCnfs.datePrisePoste ? formatDate(nextStatCnfs.datePrisePoste) : 'Non renseignée',
    dateFinFormation: nextStatCnfs.dateFinFormation ? formatDate(nextStatCnfs.dateFinFormation) : 'Non renseignée',
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
