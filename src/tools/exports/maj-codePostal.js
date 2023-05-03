#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');
const FichierCodePostaux = require('../../../data/imports/laposte_hexasmal.json'); // nouveau fichier requis à exporter.

execute(__filename, async ({ logger }) => {
  logger.info(`Generating JSON file...`);
  let jsonFile = path.join(__dirname, '../../../data/exports', 'code-commune.json');
  let file = fs.createWriteStream(jsonFile, { flags: 'w' });
  let array = [];
  FichierCodePostaux.forEach(code =>
    array.push({
      'Code_postal': code?.fields.code_postal,
      'Nom_commune': code?.fields.nom_de_la_commune,
      'Code_Commune': code?.fields.code_commune_insee,
    }));
  let arrayNotDoublon = [...new Set(array.map(e => JSON.stringify(e)))];// delete doublon
  arrayNotDoublon = arrayNotDoublon.map(e => JSON.parse(e));
  file.write(JSON.stringify(arrayNotDoublon));
  file.close();
});
