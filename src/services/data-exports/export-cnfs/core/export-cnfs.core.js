const dayjs = require('dayjs');

const formatDate = dateFin => dayjs(new Date(dateFin)).format('DD/MM/YYYY');

const userActifStatus = (mattermost, emailCNError) => mattermost !== undefined && emailCNError !== undefined ? 'Oui' : 'Non';

const getStatsCnfs = async (
  { dateDebut, dateFin, nomOrdre, ordre, certifie, isUserActif },
  { getStatsCnfs, getStructureNameFromId }) => {
  return Promise.all(
    (await getStatsCnfs(dateDebut, dateFin, nomOrdre, ordre, certifie, isUserActif)).map(async statCnfs => {
      const { structureId, emailCNError, mattermost, ...nextStatCnfs } = statCnfs;

      return {
        ...nextStatCnfs,
        datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
        dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
        nomStructure: (await getStructureNameFromId(structureId)).nom,
        certifie: 'Non',
        isUserActif: userActifStatus(mattermost, emailCNError)
      };
    })
  );
};

module.exports = {
  getStatsCnfs
};
