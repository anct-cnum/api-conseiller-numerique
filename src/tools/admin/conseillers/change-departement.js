const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();
const axios = require('axios');
const dayjs = require('dayjs');

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-cp, --codePostal <codePostal>', 'indiquez le code postal');
  program.option('-c, --codeCommune <codeCommune>', 'indiquez le code Commune');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let codePostal = program.codePostal;
  let codeCommune = program.codeCommune;

  if (id === 0 || !codeCommune) {
    exit('Paramètres invalides. Veuillez préciser un id et un code Commune');
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

  if (codePostal === undefined && data.properties.codesPostaux.length > 1) {
    exit(`Veuillez entrez un code Postal car il y a plusieurs code postaux pour la commune ${data.properties.nom} => [${data.properties.codesPostaux}]`);
    return;
  }
  const cp = codePostal === undefined ? data.properties.codesPostaux[0] : codePostal;
  const updatedAt = new Date();
  const datePG = dayjs(updatedAt).format('YYYY-MM-DD');

  const miseAJour = {
    location: data.geometry,
    codePostal: cp,
    nomCommune: data.properties.nom,
    codeCommune: data.properties.code,
    codeDepartement: data.properties.codeDepartement,
    codeRegion: data.properties.codeRegion,
    updatedAt: updatedAt
  };
  const miseAJourMiseEnRelation = {
    'conseillerObj.location': data.geometry,
    'conseillerObj.codePostal': cp,
    'conseillerObj.nomCommune': data.properties.nom,
    'conseillerObj.codeCommune': data.properties.code,
    'conseillerObj.codeDepartement': data.properties.codeDepartement,
    'conseillerObj.codeRegion': data.properties.codeRegion,
    'conseillerObj.updatedAt': updatedAt
  };
  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: miseAJour });
    await db.collection('misesEnRelation').deleteMany({
      'conseiller.$id': conseiller._id,
      'statut': { '$in': ['nouvelle', 'nonInteressee', 'interessee'] }
    });
    await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, { $set: miseAJourMiseEnRelation });

    await pool.query(`UPDATE djapp_coach
      SET (
      location,
      zip_code,
      geo_name,
      commune_code,
      departement_code,
      region_code,
      updated
      ) = (ST_GeomFromGeoJSON ($2),$3,$4,$5,$6,$7,$8)
       WHERE id = $1`,
    [
      id,
      data.geometry,
      cp,
      data.properties.nom,
      data.properties.code,
      data.properties.codeDepartement,
      data.properties.codeRegion,
      datePG
    ]);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`le nouveau code Postal est bien le ${cp} => conseiller avec l'idPG: ${id}`);
  exit();
});
