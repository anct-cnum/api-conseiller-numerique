const { program } = require('commander');
const { execute } = require('../../utils');
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

  if (id === 0 || !codePostal) {
    exit('Paramètres invalides. Veuillez préciser un id et un nombre en kilomètre');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  try {
    const params = {};
    const urlAPI2 = `https://geo.api.gouv.fr/communes/${codeCommune}?format=geojson&geometry=centre`;
    const { data } = await axios.get(urlAPI2, { params: params });
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
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: miseAJour });
    await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseiller._id }, { $set: miseAJourMiseEnRelation });
  } catch (error) {
    logger.error(`Erreur MongoDB : ${error.message}`);
    Sentry.captureException(error);
    return;
  }

  logger.info(`ok`);
  exit();
});
