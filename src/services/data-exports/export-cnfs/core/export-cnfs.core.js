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

const getFormatHistoriqueGroupeCRA = groupeCRAHistorique => JSON.stringify(groupeCRAHistorique);

const prettifyAndComplete = getStructureNameFromId => async statCnfs => {
  const { structureId, emailCNError, mattermost, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
    dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
    structureId: structureId ? (await getStructureNameFromId(structureId)).idPG : undefined,
    nomStructure: structureId ? (await getStructureNameFromId(structureId)).nom : '',
    emailStructure: structureId ? (await getStructureNameFromId(structureId)).contact?.email : '',
    // eslint-disable-next-line max-len
    adresseStructure: structureId ? formatAdresseStructure((await getStructureNameFromId(structureId)).insee) : '',
    codeDepartement: structureId ? (await getStructureNameFromId(structureId)).codeDepartement : '',
    certifie: 'Non',
    groupeCRA: nextStatCnfs.groupeCRA ?? undefined,
    groupeCRAHistorique: getFormatHistoriqueGroupeCRA(nextStatCnfs.groupeCRAHistorique) ?? undefined,
    isUserActif: userActifStatus(mattermost, emailCNError)
  };
};

const getStatsCnfs = async (
  { dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif },
  { getStatsCnfs, getStructureNameFromId }) => {
  return Promise.all(
    (await getStatsCnfs(dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif)).map(prettifyAndComplete(getStructureNameFromId))
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

const getStatsCnfsCoordinateur = async (
  { dateDebut, dateFin, nomOrdre, ordre, isUserActif },
  { getStatsCnfsCoordinateur, getStructureNameFromId }) => {
  return Promise.all(
    (await getStatsCnfsCoordinateur(dateDebut, dateFin, nomOrdre, ordre, isUserActif)).map(prettifyAndComplete(getStructureNameFromId))
  );
};

const getStatsCnfsFilterCoordinateur = db => async (statsCnfsNoFilter, user) => {
  const coordinateur = await db.collection('conseillers').findOne({ _id: user.entity.oid });
  const filterCnfsByCoordinateur = [];
  coordinateur?.listeSubordonnes?.liste.push('84');
  switch (coordinateur?.listeSubordonnes?.type) {
    case 'conseillers':
      statsCnfsNoFilter.forEach(cnfs => {
        if (coordinateur?.listeSubordonnes?.liste.includes(cnfs?._id)) {
          filterCnfsByCoordinateur.push(cnfs);
        }
      });
      break;
    case 'codeDepartement':
      statsCnfsNoFilter.forEach(cnfs => {
        if (cnfs?.codeDepartement && coordinateur?.listeSubordonnes?.liste.includes(cnfs?.codeDepartement)) {
          filterCnfsByCoordinateur.push(cnfs);
        }
      });
      break;
    case 'codeRegion':
      statsCnfsNoFilter.forEach(cnfs => {
        if (cnfs?.codeRegion && coordinateur?.listeSubordonnes?.liste.includes(cnfs?.codeRegion)) {
          filterCnfsByCoordinateur.push(cnfs);
        }
      });
      break;
    default:
      break;
  }
  return filterCnfsByCoordinateur;
};

const userConnected = async (db, authentication) => await db.collection('users').findOne({ _id: new ObjectID(authentication[1]) });
module.exports = {
  getStatsCnfs,
  getStatsCnfsFilterStructure,
  getStatsCnfsCoordinateur,
  getStatsCnfsFilterCoordinateur,
  userConnected
};
