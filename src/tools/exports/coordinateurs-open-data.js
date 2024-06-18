#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

const { execute } = require('../utils');
const { getCoordinateurs, getStatsCoordination } = require('../../services/coordinateurs/repository/coordinateurs.repository.js');
const { listeCoordinateurs } = require('../../services/coordinateurs/core/coordinateurs.core.js');

program.description('Export coordinateurs open data')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, exit }) => {
  const csvCellSeparator = ';';
  const csvLineSeparator = '\n';
  logger.info(`Generating CSV file...`);

  let csvFile = path.join(__dirname, '../../../data', `coordinateurs_open_data.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  await listeCoordinateurs({
    getCoordinateurs: getCoordinateurs(db),
    getStatsCoordination: getStatsCoordination(db),
  }).then(coordinateurs => {
    const fileHeaders = [
      'Nom',
      'Prénom',
      'Périmètre',
      'Nom de la structure',
      'Adresse de la structure',
      'Code postal de la structure',
      'Code commune de la structure',
      'Commune de la structure',
    ];
    file.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...coordinateurs.map(coordinateur =>
          [
            coordinateur.nom,
            coordinateur.prenom,
            coordinateur.perimetre,
            coordinateur.nomStructure,
            coordinateur.adresse,
            coordinateur.codePostal,
            coordinateur.codeCommuneStructure,
            coordinateur.commune,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    file.close();
    logger.info(`CSV file generated`);
    exit();
  }).catch(error => {
    logger.error(error);
    exit();
  });
});
