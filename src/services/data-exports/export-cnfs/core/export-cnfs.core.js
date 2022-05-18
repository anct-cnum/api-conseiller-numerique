const { ObjectID } = require('mongodb');
const dayjs = require('dayjs');

const formatDate = dateFin => dayjs(new Date(dateFin)).format('DD/MM/YYYY');

const userActifStatus = (mattermost, emailCNError) => mattermost !== undefined && emailCNError !== undefined ? 'Oui' : 'Non';

const formatAdresseStructure = insee => {

  let adresse = (insee?.etablissement?.adresse?.numero_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.type_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.nom_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.complement_adresse ? insee.etablissement.adresse.complement_adresse + ' ' : ' ') +
  (insee?.etablissement?.adresse?.code_postal ?? '') + ' ' +
  (insee?.etablissement?.adresse?.localite ?? '');

  return adresse.replace(/["']/g, '');
};

const getFormatHistoriqueGroupeCRA = groupeCRAHistorique => JSON.stringify(new Array(groupeCRAHistorique).slice(-3));

const prettifyAndComplete = () => async statCnfs => {
  const { emailCNError, mattermost, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
    dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
    adresseStructure: nextStatCnfs.structure?.insee ? formatAdresseStructure(nextStatCnfs.structure.insee) : '',
    certifie: 'Non',
    groupeCRA: nextStatCnfs.groupeCRA ?? '',
    groupeCRAHistorique: nextStatCnfs.groupeCRAHistorique ? getFormatHistoriqueGroupeCRA(nextStatCnfs.groupeCRAHistorique) : '',
    isUserActif: userActifStatus(mattermost, emailCNError)
  };
};

const getStatsCnfs = async (
  { dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif },
  { getStatsCnfs }) => {
  return Promise.all(
    (await getStatsCnfs(dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif)).map(prettifyAndComplete())
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
