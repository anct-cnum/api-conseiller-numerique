const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();
const axios = require('axios');

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-cp, --codePostal <codePostal>', 'indiquez le code postal');
  program.option('-c, --codeCommune <codeCommune>', 'indiquez le code Commune');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let codePostal = program.codePostal;
  let codeCommune = program.codeCommune;

  if (id === 0 || !codePostal || !codeCommune) {
    exit('Paramètres invalides. Veuillez préciser un id , un code Postal et un code Commune');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  const params = {};
  const urlAPI = `https://geo.api.gouv.fr/communes/${codeCommune}?format=geojson&geometry=centre`;
  const { data } = await axios.get(urlAPI, { params: params });
  const miseAJour = {
    location: data.geometry,
    codePostal: codePostal,
    nomCommune: data.properties.nom,
    codeCommune: data.properties.code,
    codeDepartement: data.properties.codeDepartement,
    codeRegion: data.properties.codeRegion
  };
  const miseAJourMiseEnRelation = {
    'conseillerObj.location': data.geometry,
    'conseillerObj.codePostal': codePostal,
    'conseillerObj.nomCommune': data.properties.nom,
    'conseillerObj.codeCommune': data.properties.code,
    'conseillerObj.codeDepartement': data.properties.codeDepartement,
    'conseillerObj.codeRegion': data.properties.codeRegion
  };

  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: miseAJour });
    await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, { $set: miseAJourMiseEnRelation });
  } catch (error) {
    logger.error(`Erreur MongoDB : ${error.message}`);
    Sentry.captureException(error);
    return;
  }
  try {
    await pool.query(`UPDATE djapp_coach
      SET (
      location,
      zip_code,
      geo_name,
      commune_code,
      departement_code,
      region_code
      ) = (ST_GeomFromGeoJSON ($2),$3,$4,$5,$6,$7)
       WHERE id = $1`,
    [
      id,
      data.geometry,
      codePostal,
      data.properties.nom,
      data.properties.code,
      data.properties.codeDepartement,
      data.properties.codeRegion
    ]);
  } catch (error) {
    logger.error(`Erreur PG : ${error.message}`);
    Sentry.captureException(error);
    return;
  }

  logger.info(`le nouveau code Postal est bien le ${codePostal} => conseiller avec l'idPG: ${id}`);
  exit();
});
