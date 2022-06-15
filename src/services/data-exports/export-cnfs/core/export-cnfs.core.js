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

const getFormatHistoriqueGroupeCRA = (nbSlice, groupeCRAHistorique) => groupeCRAHistorique.slice(nbSlice);

const valueHistoryCra = groupeCRAHistorique =>
  JSON.stringify(`${groupeCRAHistorique.map(h => `${`groupe ${h.numero} le ${dayjs(h.dateDeChangement).format('DD/MM/YYYY')}`}`)}`);

const prettifyAndComplete = () => async statCnfs => {
  const { emailCNError, mattermost, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    datePrisePoste: formatDate(nextStatCnfs.datePrisePoste),
    dateFinFormation: formatDate(nextStatCnfs.dateFinFormation),
    adresseStructure: nextStatCnfs.structure?.insee ? formatAdresseStructure(nextStatCnfs.structure.insee) : '',
    certifie: 'Non',
    groupeCRA: nextStatCnfs.groupeCRA ?? '',
    groupeCRAHistorique: nextStatCnfs.groupeCRAHistorique ? valueHistoryCra(getFormatHistoriqueGroupeCRA(-3, nextStatCnfs.groupeCRAHistorique)) : '',
    isUserActif: userActifStatus(mattermost, emailCNError),
    mattermost
  };
};

const prettifyAndCompleteCnfsWithoutCRA = () => async CnfsWithoutCRA => {
  return {
    ...CnfsWithoutCRA,
    date1MoisEtDemi: formatDate(getFormatHistoriqueGroupeCRA(-1, CnfsWithoutCRA.groupeCRAHistorique)[0]['dateMailSendConseillerM+1,5']),
    date1Mois: formatDate(getFormatHistoriqueGroupeCRA(-1, CnfsWithoutCRA.groupeCRAHistorique)[0]['dateMailSendConseillerM+1'])
  };
};

const getStatsCnfs = async (
  { dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif, nom, structureId },
  { getStatsCnfs }) => {
  return Promise.all(
    (await getStatsCnfs(dateDebut, dateFin, nomOrdre, ordre, certifie, groupeCRA, isUserActif, nom, structureId)).map(prettifyAndComplete())
  );
};

const getCnfsWithoutCRA = async ({ getCnfsWithoutCRA }) => Promise.all((await getCnfsWithoutCRA()).map(prettifyAndCompleteCnfsWithoutCRA()));

const userConnected = async (db, authentication) => await db.collection('users').findOne({ _id: new ObjectID(authentication[1]) });
module.exports = {
  getStatsCnfs,
  getCnfsWithoutCRA,
  userConnected
};
