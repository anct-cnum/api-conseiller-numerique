const Joi = require('joi');
const dayjs = require('dayjs');

const validateExportCnfsSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string().error(new Error('Le nom de l\'ordre est invalide')),
  ordre: Joi.number().error(new Error('L\'ordre est invalide')),
  isUserActif: Joi.boolean().error(new Error('Le filtre actif est invalide')),
  certifie: Joi.boolean().error(new Error('Le filtre certifie est invalide')),
  groupeCRA: Joi.number().error(new Error('Le filtre groupe CRA est invalide')),
  nom: Joi.string().error(new Error('le filtre nom est invalide')),
  structureId: Joi.string().error(new Error('le filtre structureId est invalide'))
}).validate(exportTerritoiresInput);

const isUserActifIdDefined = isUserActif => isUserActif !== undefined ? { isUserActif } : {};

const certifieIfDefined = certifie => certifie !== undefined ? { certifie } : {};

const groupeCRAIfDefined = groupeCRA => groupeCRA !== undefined ? { groupeCRA } : {};

const byNameIfDefined = nom => nom !== undefined ? { nom } : {};

const byStructureIdIfDefined = structureId => structureId !== undefined ? { structureId } : {};

const orderingDefined = sort => {
  if (sort === undefined) {
    return {};
  }

  return {
    nomOrdre: Object.keys(sort)[0],
    ordre: Object.values(sort)[0],
  };
};

const exportCnfsQueryToSchema = query => {
  return {
    dateDebut: new Date(query.datePrisePoste.$gt),
    dateFin: new Date(query.datePrisePoste.$lt),
    ...orderingDefined(query.$sort),
    ...isUserActifIdDefined(query.isUserActif),
    ...certifieIfDefined(query.certifie),
    ...groupeCRAIfDefined(query.groupeCRA),
    ...byNameIfDefined(query.$search),
    ...byStructureIdIfDefined(query.structureId)
  };
};

const getExportCnfsFileName = (dateDebut, dateFin) =>
  `export-cnfs_entre_${dayjs(dateDebut).format('YYYY-MM-DD')}_et_${dayjs(dateFin).format('YYYY-MM-DD')}.csv`;

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const buildExportCnfsCsvFileContent = async (statsCnfs, user) => {
  let fileHeaders = [
    'Prénom',
    'Nom',
    'Email',
    'Email @conseiller-numerique.fr',
    'Nom de la structure',
    'Code Postal',
    'Date de recrutement',
    'Date de fin de formation',
    'Certification',
    'Activé',
    'CRA Saisis'
  ];
  if (user.roles.includes('admin_coop')) {
    fileHeaders.splice(0, 0, 'Id du conseiller');
    fileHeaders[6] = 'Code Postal du conseiller';
    fileHeaders.splice(5, 0, 'Compte Activé');
    fileHeaders.splice(6, 0, 'Id de la structure');
    fileHeaders.splice(8, 0, 'Email de la structure');
    fileHeaders.splice(9, 0, 'Adresse de la structure');
    fileHeaders.splice(10, 0, 'Code département de la structure');
    fileHeaders.splice(12, 0, 'Code département du conseiller');
    fileHeaders.splice(15, 0, 'GroupeCRA');
    fileHeaders.splice(20, 0, 'Nombre de personne accompagné');
    fileHeaders.push('Nom Supérieur hiérarchique');
    fileHeaders.push('Prénom supérieur hiérarchique');
    fileHeaders.push('Fonction supérieur hiérarchique');
    fileHeaders.push('Email supérieur hiérarchique');
    fileHeaders.push('Numéro téléphone supérieur hiérarchique');
    fileHeaders.push('Historique des groupes CRA');


    return [
      fileHeaders.join(csvCellSeparator),
      ...statsCnfs.map(statCnfs => [
        statCnfs.idPG,
        statCnfs.prenom,
        statCnfs.nom,
        statCnfs.email,
        statCnfs.mattermost?.id ? statCnfs.emailCN?.address : '',
        statCnfs.mattermost?.id ? 'Oui' : 'Non',
        statCnfs.structure?.idPG,
        statCnfs.structure?.nom.replace(/["',]/g, ''),
        statCnfs.structure?.contact?.email,
        statCnfs.adresseStructure,
        statCnfs.structure?.codeDepartement,
        statCnfs.codePostal,
        statCnfs.codeDepartement,
        statCnfs.datePrisePoste,
        statCnfs.dateFinFormation,
        statCnfs?.groupeCRA,
        statCnfs.certifie,
        statCnfs.isUserActif,
        statCnfs.craCount,
        statCnfs.countPersonnesAccompagnees,
        statCnfs?.supHierarchique?.nom,
        statCnfs?.supHierarchique?.prenom,
        statCnfs?.supHierarchique?.fonction,
        statCnfs?.supHierarchique?.email,
        `"${statCnfs?.supHierarchique?.numeroTelephone ?? ''}"`,
        statCnfs?.groupeCRAHistorique.replace(/[,]/g, '|')
      ].join(csvCellSeparator))
    ].join(csvLineSeparator);
  }
  return [
    fileHeaders.join(csvCellSeparator),
    ...statsCnfs.map(statCnfs => [
      statCnfs.prenom,
      statCnfs.nom,
      statCnfs.email,
      statCnfs.mattermost?.id ? statCnfs.emailCN?.address : 'compte COOP non créé',
      statCnfs.structure?.nom.replace(/["',]/g, ''),
      statCnfs.codePostal,
      statCnfs.datePrisePoste,
      statCnfs.dateFinFormation,
      statCnfs.certifie,
      statCnfs.isUserActif,
      statCnfs.craCount,
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

const buildExportCnfsWithoutCRACsvFileContent = async conseillers => {
  const fileHeaders = [
    'Nom',
    'Prénom',
    'Email @conseiller-numerique.fr',
    'Code Postal du conseiller',
    'Code département du conseiller',
    'Date d\'envoi du mail M+1',
    'Date d\'envoi du mail M+1,5'
  ];
  return [
    fileHeaders.join(csvCellSeparator),
    ...conseillers.map(conseiller => [
      conseiller.nom,
      conseiller.prenom,
      conseiller.emailCN.address,
      conseiller.codePostal,
      conseiller.codeDepartement,
      conseiller.date1Mois,
      conseiller.date1MoisEtDemi
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  validateExportCnfsSchema,
  exportCnfsQueryToSchema,
  getExportCnfsFileName,
  buildExportCnfsCsvFileContent,
  buildExportCnfsWithoutCRACsvFileContent
};
