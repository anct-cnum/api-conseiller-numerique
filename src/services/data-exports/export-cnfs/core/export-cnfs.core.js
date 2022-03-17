const { ObjectID } = require('mongodb');
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
    codeDepartement: structureId ? (await getStructureNameFromId(structureId)).codeDepartement : '',
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
const getStatsCnfsFilterStructure = db => async (statsCnfsNoFilter, user) => {
  if (user.roles.includes('admin_coop')) {
    return statsCnfsNoFilter;
  }
  const structure = await db.collection('structures').findOne({ _id: user.entity.oid });
  const filterCnfsByStructure = statsCnfsNoFilter.filter(cnfs => cnfs.nomStructure === structure.nom);
  return filterCnfsByStructure;
};
const userConnected = async (db, authentication) => await db.collection('users').findOne({ _id: new ObjectID(authentication[1]) });
module.exports = {
  getStatsCnfs,
  getStatsCnfsFilterStructure,
  userConnected
};
