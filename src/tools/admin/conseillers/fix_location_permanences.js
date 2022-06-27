#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { ObjectID } = require('mongodb');
const axios = require('axios');

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ logger, exit, db }) => {

  program.option('-a, --adresse <adresse>', 'adresse: "clear text"');
  program.option('-i, --id <id>', 'id: MongoDB ObjecID');
  program.option('-idx, --index <index>', 'index: index');
  program.option('-v, --verif', 'verif: pour vérifier que l\'adresse est bien à l\'adresse indiqué');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const adresse = program.adresse;
  const id = program.id;
  const verif = program.verif;
  const index = program.index;

  if ((!adresse && !verif) || !id) {
    exit('Paramètres invalides');
    return;
  }
  const permanence = await db.collection('permanences').findOne({ _id: new ObjectID(id), location: null });
  if (!permanence) {
    exit('Permanence non trouvé ');
    return;
  }
  const { numeroRue, rue, codePostal, ville } = permanence?.adresse;
  let adressePostale = adresse ? adresse : `${numeroRue} ${rue} ${ville} ${codePostal}`;
  adressePostale = encodeURI(adressePostale);
  const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adressePostale}`;
  const result = await axios.get(urlAPI, { params: {} });
  const data = result.data?.features;
  if (verif) {
    logger.info('l\'adresse est : ' + adressePostale + ` et il y a ${data.length} résultat`);
    console.log(data); // pour voir lequel choisir
    return;
  }

  if (index) {
    const location = data[index].geometry;
    await db.collection('permanences').updateOne({ _id: new ObjectID(id) }, { $set: { location } });
    logger.info(`correction de la location id Permanence : ${id} avec les infos de l'api adresse : ${data[index]}`);
  } else {
    logger.info(`Index non défini`);
  }
});
