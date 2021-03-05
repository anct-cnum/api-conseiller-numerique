#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const ExcelJS = require('exceljs');

program
.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

execute(async ({ db, logger }) => {
  const processStructure = async s => {
    logger.info(JSON.stringify(s));
    
    const match = await db.collection('structures').findOne({ idPG: s.id });
    // xxx mode dryrun pour valider le fichier Excel

    // Si on a un id
    if (s.id !== null && match) {
      const filter = { idPG: s.id };
      const updateDoc = {
        $set: {
          siret: s.siret,
          estLabelliseFranceServices: s.labelFranceServices,
          nombreConseillersPrefet: s.nombreConseillers,
          nombreConseillersCoselec: s.nombreConseillersCoselec,
          avisPrefet: s.avis,
          avisCoselec: s.avisCoselec,
          commentairePrefet: s.commentaire,
          updatedAt: new Date(),
        },
      };

      if (s.avisCoselec === 'POSITIF') {
        updateDoc.$set = { ...updateDoc.$set, ...{ statut: 'VALIDATION_COSELEC', coselecAt: new Date() } };
      }

      const result = await db.collection('structures').updateOne(filter, updateDoc);

      logger.info(
        `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
      );
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret });

      if (match) {
        const filter = { siret: s.siret };
        const updateDoc = {
          $set: {
            estLabelliseFranceServices: s.labelFranceServices,
            nombreConseillersPrefet: s.nombreConseillers,
            nombreConseillersCoselec: s.nombreConseillersCoselec,
            avisPrefet: s.avis,
            avisCoselec: s.avisCoselec,
            commentairePrefet: s.commentaire,
            updatedAt: new Date(),
          }
        };

        if (s.avisCoselec === 'POSITIF') {
          updateDoc.$set = { ...updateDoc.$set, ...{ statut: 'VALIDATION_COSELEC', coselecAt: new Date() } };
        }

        const result = await db.collection('structures').updateOne(filter, updateDoc);

        logger.info(
          `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
        );
      }
    }
  };

  const readExcel = async file => {
    const start = 2; // Début de la liste des structures

    // Colonnes Excel
    const ID = 1;
    const SIRET = 2;
    const LABEL_FRANCE_SERVICES = 7;
    const NOMBRE_CONSEILLERS = 8;
    const AVIS = 9;
    const COMMENTAIRE = 10;
    const AVIS_COSELEC = 12;
    const NOMBRE_CONSEILLERS_COSELEC = 13;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file);

    for await (const worksheetReader of workbookReader) {
      //if (worksheetReader.name !== 'Fichier COSELEC') {
      if (worksheetReader.name !== 'Feuille6') {
        continue;
      }

      let i = 0;
      for await (const row of worksheetReader) {
        if (++i < start) {
          continue;
        }
        let id = row.getCell(ID).value;
        logger.info(JSON.stringify(id));
        if (!/^\d+$/.test(id)) {
          continue;
        }

        await processStructure({
          id: !/^0$/.test(row.getCell(ID).value) ? ~~row.getCell(ID).value : null,
          siret: /^\d{14}$/.test(row.getCell(SIRET).value) ? String(row.getCell(SIRET).value) : null,
          labelFranceServices: /^OUI|NON$/.test(row.getCell(LABEL_FRANCE_SERVICES).value) ? (row.getCell(LABEL_FRANCE_SERVICES).value === 'OUI') : null,
          nombreConseillers: /^\d+$/.test(row.getCell(NOMBRE_CONSEILLERS).value) ? row.getCell(NOMBRE_CONSEILLERS).value : 0,
          avis: row.getCell(AVIS).value,
          commentaire: !/^0$/.test() ? row.getCell(COMMENTAIRE).value : '',
          avisCoselec: /^POSITIF|NÉGATIF|EXAMEN COMPLÉMENTAIRE$/.test(row.getCell(AVIS_COSELEC).value) ? row.getCell(AVIS_COSELEC).value : null,
          nombreConseillersCoselec: /^\d+$/.test(row.getCell(NOMBRE_CONSEILLERS_COSELEC).value) ? row.getCell(NOMBRE_CONSEILLERS_COSELEC).value : 0,
        });
      }
    }
  };

  await readExcel(program.file);
});

