const Joi = require('joi');
const { NotFound } = require('@feathersjs/errors');

const checkAuth = req => {
  return req.feathers?.authentication !== undefined;
};

const checkRole = (roles, authorized) => {
  return roles.includes(authorized);
};

const checkSchema = req => {
  const schema = Joi.object({
    page: Joi.number().required().error(new Error('Le numéro de page est invalide')),
    territoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
    dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
    dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
    nomOrdre: Joi.string().required().error(new Error('Le nom de l\'ordre est invalide')),
    ordre: Joi.number().required().error(new Error('L\'ordre est invalide')),
  }).validate(req.query);

  return schema;
};

const checkSchemaPrefet = req => {
  const schema = Joi.object({
    territoire: Joi.string().required().valid('codeDepartement', 'codeRegion').error(new Error('Le type de territoire est invalide')),
    dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
    dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  }).validate(req.query);

  return schema;
};

const getTerritoires = async (type, date, ordre, page, limit, { getDepartements, getRegions }) => {
  if (type === 'codeDepartement') {
    return await getDepartements(date, ordre, page, limit);
  } else if (type === 'codeRegion') {
    return await getRegions(date, ordre, page, limit);
  }
};

const getTotalTerritoires = async (date, type, { getTotalDepartements, getTotalRegions }) => {
  if (type === 'codeDepartement') {
    return await getTotalDepartements(date);
  } else if (type === 'codeRegion') {
    return await getTotalRegions(date);
  }
};

const getCodesPostauxCras = async (idConseiller, { getCodesPostauxStatistiquesCras }) => {
  const liste = await getCodesPostauxStatistiquesCras(idConseiller);
  const listeDefinitive = [];
  liste.forEach(paire => {
    if (listeDefinitive.findIndex(item => item.id === paire._id.codePostal) > -1) {
      listeDefinitive.find(item => item.id === paire._id.codePostal).codePostal.push(paire._id.codePostal + ' - ' + paire._id.ville);
    } else {
      listeDefinitive.push({ id: paire._id.codePostal, codePostal: [paire._id.codePostal + ' - ' + paire._id.ville] });
    }
  });

  return listeDefinitive.sort();
};

const getCodesPostauxCrasStructure = async (idConseiller, { getCodesPostauxStatistiquesCrasStructure }) => {
  return await getCodesPostauxStatistiquesCrasStructure(idConseiller);
};

const getConseillersIdsByStructure = async (idStructure, res, { getConseillersIdsByStructure }) => {
  const miseEnRelations = await getConseillersIdsByStructure(idStructure);
  if (miseEnRelations === null) {
    res.status(404).send(new NotFound('no matchings', {
      idStructure
    }).toJSON());
    return;
  }
  let conseillerIds = [];
  miseEnRelations.forEach(miseEnRelation => {
    conseillerIds.push(miseEnRelation?.conseillerObj._id);
  });

  return conseillerIds;
};

const getStructuresByPrefetCode = async (code, page, limit, res, { getStructuresIdsByPrefecture }) => {
  const structures = await getStructuresIdsByPrefecture(code, page, limit);
  if (structures === null || structures.length === 0) {
    res.status(404).send(new NotFound('no matchings', {
      code
    }).toJSON());
    return;
  }
  return structures;
};

const countStructures = async (code, { countStructures }) => {
  return await countStructures(code);
};

const getTerritoiresPrefet = async (type, date, codeDepartement, codeRegion, nomRegion, { getDepartement, getRegion }) => {
  if (type === 'codeDepartement') {
    return await getDepartement(date, codeDepartement, codeRegion);
  } else if (type === 'codeRegion') {
    return await getRegion(date, nomRegion, codeRegion);
  }
};

module.exports = {
  checkAuth,
  checkRole,
  checkSchema,
  checkSchemaPrefet,
  getTerritoires,
  getTotalTerritoires,
  getCodesPostauxCras,
  getCodesPostauxCrasStructure,
  getTerritoiresPrefet,
  getConseillersIdsByStructure,
  getStructuresByPrefetCode,
  countStructures,
};
