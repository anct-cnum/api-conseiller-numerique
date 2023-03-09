'use strict';

const { execute } = require('../utils');
const axios = require('axios');
const codePostauxFichier = require('../../../data/imports/codesPostaux.json');
const { program } = require('commander');


const updateVillePermanence = db => async (findVille, v) => {
  await db.collection('permanences').updateOne({ 'adresse.ville': v.ville, 'adresse.codePostal': v.codePostal },
    { '$set': {
      'adresse.ville': findVille[0].Nom_commune,
      // 'updatedAt': new Date() // A voir si on change la date pour metabase etc..
    } });
  await db.collection('cras').updateOne({ 'cra.codePostal': v.ville, 'cra.nomCommune': v.codePostal },
    { '$set': {
      'cra.nomCommune': findVille[0].Nom_commune,
    } });
};

const formatText = mot => {
  let m = mot.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/[',-]/g, ' ');
  m = m.replace(/\bSAINT\b/gi, 'ST');
  m = m.replace(/\bSAINTE\b/gi, 'STE');
  return m;
};

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-l, --limit <limit>', 'limit: limit');
  program.option('-p, --partie <partie>', 'partie: villes ou codePostaux ou verif');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const limit = ~~program.limit === 0 ? 1 : ~~program.limit;
  const partie = program.partie;
  let adresses = [];

  if (!['villes', 'codePostaux', 'verif'].includes(partie)) {
    exit(`Partie incorrect, veuillez choisir parmi la liste ['villes', 'codePostaux', 'verif']`);
    return;
  }

  if (partie === 'villes' || partie === 'codePostaux') {
    let limitCount = 0;
    adresses = await db.collection('permanences').aggregate([
      { '$group': { '_id': null,
        'villes': { $addToSet: '$adresse' },
        'codePostaux': { $addToSet: '$adresse' } }
      },
      { $unwind: '$villes' },
      { $match: { 'villes.ville': { '$nin': codePostauxFichier.map(e => String(e.Nom_commune)) } } },
      { $unwind: '$codePostaux' },
      { $match: { 'codePostaux.codePostal': { '$nin': codePostauxFichier.map(e => String(e.Code_postal)) } } },
      { $project: { 'codePostaux.codePostal': 1, 'codePostaux.ville': 1, 'villes.ville': 1, 'villes.codePostal': 1 } },
      { '$group': {
        '_id': null,
        'villes': { $addToSet: '$villes' },
        'codePostaux': { $addToSet: '$codePostaux' }
      } }
    ]).toArray();


    if (partie === 'villes') {
      logger.info(`Correction orthographe des ${adresses[0]?.villes.length} villes qui n'existe pas dans le fichier (limit: ${limit})...`);
      let oneResultAndUpdate = [];
      let multipleResultAndUpdate = [];
      let noResult = [];
      let error = [];
      for (const v of adresses[0].villes.slice(0, limit)) {
        let findVille = codePostauxFichier.filter(e => [String(e.Code_postal), parseInt(e.Code_postal)].includes(v.codePostal));
        let mot = formatText(v.ville);
        findVille = findVille.filter(e => e.Nom_commune === mot);
        try {
          if (findVille.length === 1) {// RESULTAT ONE =>
            oneResultAndUpdate.push({ base: v, mot });
            await updateVillePermanence(db)(findVille, v);
          } else if (findVille.length >= 2) {
            let VilleNotDoublon = [...new Set(findVille.map(e => JSON.stringify(e)))];// delete doublon !
            VilleNotDoublon = VilleNotDoublon.map(e => JSON.parse(e));
            if (VilleNotDoublon.length === 1) {
              await updateVillePermanence(db)(findVille, v);
              oneResultAndUpdate.push({ base: v, mot });
            } else {
              multipleResultAndUpdate.push({ base: v, mot, fichierJson: findVille });
            }
          } else {// AUCUN RESULTAT
            noResult.push({ base: v, mot });
          }
        } catch (error) {
          error.push({ base: v, mot });
        }
        limitCount++;
      }
      // pour historiser lors du traitement..
      console.log('oneResultAndUpdate:', oneResultAndUpdate.length, '/', limitCount, ':', oneResultAndUpdate);
      console.log('multipleResultAndUpdate:', multipleResultAndUpdate.length, '/', limitCount, ':', multipleResultAndUpdate);
      console.log('noResult:', noResult.length, '/', limitCount, ':', noResult);
      console.log('Error:', error.length, '/', limitCount, ':', error);
    }
    if (partie === 'codePostaux') {
      logger.info(`Correction des ${adresses[0]?.codePostaux.length} code postaux qui n'existe pas dans le fichier json....`);
      const codeAcorriger = [];
      const codeNoExists = [];
      for (const c of adresses[0].codePostaux.slice(0, limit)) {
        const ville = formatText(c.ville);
        const code = c.codePostal;
        const codeFormat = code?.replace(/ /gi, '');
        console.log('codeFormat:', ville, code, '=>', codeFormat);
        const filter = codePostauxFichier.filter(e => [String(e.Code_postal), parseInt(e.Code_postal)].includes(codeFormat) && (e.Nom_commune === ville));
        if (filter.length > 0) {
          // prevoir un update..
          codeAcorriger.push({ base: c, filter });
        } else {
          // Action ?
          codeNoExists.push({ base: c, filter });
        }
        limitCount++;
      }
      console.log('codeAcorriger:', codeAcorriger);
      console.log('codeNoExists:', codeNoExists);
    }
    logger.info(`Fin de la correction des ${limitCount}/${adresses[0][partie]?.length} (limit: ${limit}) (partie ${partie})`);
  }

  if (partie === 'verif') {
    let verifOKLocation = 0;
    let notOKLocation = [];
    let notOKLocationError = [];

    adresses = await db.collection('permanences').aggregate([
      { $project: { '_id': 0, 'adresse': 1, 'location': 1 } },
      { $limit: limit }
    ]).toArray();

    for (const a of adresses) {
      const adresse = a.adresse;
      const adressePostale = encodeURI(`${adresse.numeroRue} ${adresse.rue} ${adresse.codePostal} ${adresse.ville}`);
      const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adressePostale}`;
      try {
        const params = {};
        const result = await axios.get(urlAPI, { params: params });
        const verifLocation = result.data?.features.find(i => String(i?.geometry?.coordinates) === String(a?.location?.coordinates));
        if (!verifLocation) {
          notOKLocation.push(a.adresse);
          // Action ? cacher les permanences ?  691/3318
        } else {
          verifOKLocation++;
        }
      } catch (error) {
        notOKLocationError.push({ message: error.message, adresse, detail: `${adresse.numeroRue} ${adresse.rue} ${adresse.codePostal} ${adresse.ville}` });
      }
    }
    console.log('verifOKLocation:', verifOKLocation, '/', adresses.length);
    console.log('notOKLocation:', notOKLocation.length, notOKLocation[0], notOKLocation[1], notOKLocation[2]);
    console.log('notOKLocationError:', notOKLocationError.length, notOKLocationError);
    logger.info(`Fin de la vérification des permanences : ${verifOKLocation}/${adresses.length} qui sont OK (partie ${partie})`);
    logger.info(`Fin de la vérification des permanences : ${notOKLocation.length}/${adresses.length} où leur location est invalide (partie ${partie})`);
    logger.info(`Fin de la vérification des permanences : ${notOKLocationError.length}/${adresses.length} qui sont en Erreur (partie ${partie})`);
  }
  exit();
});
