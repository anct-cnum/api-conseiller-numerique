#!/usr/bin/env node
'use strict';

const { getEtablissementBySiretEntrepriseApiV3 } = require('../../utils/entreprise.api.gouv');
const { execute } = require('../utils');
const { program } = require('commander');

program.option('-limit, --limit <limit>', 'Nombre de structures traitées', parseInt)
.option('-versionDb, --versionDb <limit>', 'Version de Mongodb', parseInt).parse(process.argv);

const getStructureApiEntrepriseV2 = db => async limit => {
  return await db.collection('structures').find({ 'insee.etablissement': { '$exists': true }, 'insee.adresse': { '$exists': false } }).limit(limit).toArray();
};

const renameInseeStructure = db => async (structure, versionDb) => {
  /* Mongodb V5 et plus */
  if (versionDb >= 5) {
    await db.collection('structures').updateOne({ '_id': structure._id },
      { $rename: { 'insee': 'inseeV2' } });
    await db.collection('misesEnRelation').updateMany({ 'structure.$id': structure._id },
      { $rename: { 'structureObj.insee': 'structureObj.inseeV2' } });
  /* Mongodb inférieur à V5 */
  } else {
    await db.collection('structures').updateOne({ '_id': structure._id },
      { $set: { 'inseeV2': structure.insee } });
    await db.collection('misesEnRelation').updateMany({ 'structure.$id': structure._id },
      { $set: { 'structureObj.inseeV2': structure.insee } });
    await db.collection('structures').updateOne({ '_id': structure._id },
      { $unset: { 'insee': '' } });
    await db.collection('misesEnRelation').updateMany({ 'structure.$id': structure._id },
      { $unset: { 'structureObj.insee': '' } });
  }
  return;
};

const addInseeV3ToStructure = db => async (structure, insee) => {
  await db.collection('structures').updateOne({ '_id': structure._id },
    { $set: { 'insee': insee } });
  await db.collection('misesEnRelation').updateMany({ 'structure.$id': structure._id },
    { $set: { 'structureObj.insee': insee } });
  return;
};

execute(__filename, async ({ logger, db, app }) => {
  //250 requêtes/min/jeton côté entreprise api V3
  const { limit = 250, versionDb = 4 } = program;
  const promises = [];
  let count = 0;
  //récupérer les structures qui possède des données de l'api V2 uniquement
  const structures = await getStructureApiEntrepriseV2(db)(limit);
  try {
    structures?.forEach(structure => {
      promises.push(new Promise(async resolve => {
        //récupération de la data insee V3
        const insee = await getEtablissementBySiretEntrepriseApiV3(structure.insee.etablissement.siret, app.get('api_entreprise'));
        if (insee) {
          //renommer insee en inseeV2 le temps de valider la migration
          await renameInseeStructure(db)(structure, versionDb);
          //mise à jour avec la data insee V3
          await addInseeV3ToStructure(db)(structure, insee);
          count++;
          logger.info(`La structure ${structure._id} a été mise à jour avec succès`);
        }
        resolve();
      }));
    });
    await Promise.all(promises);
  } catch (error) {
    logger.error(error);
  }
  logger.info(`${count} structure(s) mise(s) à jour`);
});
