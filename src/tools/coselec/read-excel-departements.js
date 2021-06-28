#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

program
.option('-r, --repertoire <repertoire>', 'répertoire')
.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

// Liste des départements
const departements = require('./departements-region.json');
const deps = new Map();
for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

execute(__filename, async ({ db, logger }) => {
  const processStructure = async s => {
    const match = await db.collection('structures').findOne({ idPG: s.id });

    // Si on a un id
    if (s.id !== null && match) {
      logger.info(`OKID,${s.id},${s.siret}`);

      const filter = { idPG: s.id };
      const updateDoc = {
        $set: {
          estLabelliseFranceServices: s.labelFranceServices,
          updatedAt: new Date(),
        },
        $push: {
          prefet: {
            avisPrefet: s.avis,
            commentairePrefet: s.commentaire,
            nombreConseillersPrefet: s.nombreConseillers,
            interventionFranceServices: s.labelFranceServices,
            interventionZRR: s.interventionZRR,
            interventionQPV: s.interventionQPV,
            codesQPV: s.codesQPV,
            nomsQuartiersQPV: s.nomsQuartiersQPV,
            fichier: s.fichier,
            ligne: s.ligne,
            insertedAt: new Date()
          },
        }
      };

      // xxx Vérifier le SIRET avec l'API Entreprise
      //if (/^\d{14}$/.test(s.siret)) {
      //updateDoc.$set = { ...updateDoc.$set, ...{ siret: s.siret } };
      //}

      const result = await db.collection('structures').updateOne(filter, updateDoc);

      logger.info(`OKUPDATE,${s.id},${s.siret},${result.matchedCount},${result.modifiedCount}`);
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // xxx Vérifier le SIRET avec l'API Entreprise
      logger.info(`OKSIRET,${s.id},${s.siret}`);

      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret });
      // S'il y a plusieurs SA avec le même siret, on n'en modifie qu'une...

      if (match) {
        const filter = { siret: s.siret };
        const updateDoc = {
          $set: {
            estLabelliseFranceServices: s.labelFranceServices,
            updatedAt: new Date(),
          },
          $push: {
            prefet: {
              avisPrefet: s.avis,
              commentairePrefet: s.commentaire,
              nombreConseillersPrefet: s.nombreConseillers,
              interventionFranceServices: s.labelFranceServices,
              interventionZRR: s.interventionZRR,
              interventionQPV: s.interventionQPV,
              codesQPV: s.codesQPV,
              nomsQuartiersQPV: s.nomsQuartiersQPV,
              fichier: s.fichier,
              ligne: s.ligne,
              insertedAt: new Date()
            },
          }
        };

        const result = await db.collection('structures').updateOne(filter, updateDoc);

        logger.info(`OKUPDATE,${s.id},${s.siret},${result.matchedCount},${result.modifiedCount}`);
      }
    } else {
      logger.info(`KO,${s.id},${s.siret},${s.nom}`);
    }
  };

  const readExcelForDep = async f => {
    logger.info(`Fichier : ${f}`);

    // Colonnes Excel
    const ID = 1;
    const SIRET = 2;
    const NOM = 3;
    const CODE_POSTAL = 4;
    const VILLE = 5;
    const EMAIL = 6;
    const INTERVENTION_FRANCE_SERVICES = 7;
    const INTERVENTION_ZRR = 8;
    const INTERVENTION_QPV = 9;
    const CODES_QPV = 10;
    const NOMS_QUARTIERS_QPV = 11;
    const NOMBRE_CONSEILLERS = 12;
    const AVIS = 13;
    const COMMENTAIRE = 14;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(f);

    for await (const worksheetReader of workbookReader) {
      let i = 0;
      for await (const row of worksheetReader) {
        i++;
        let nom = row.getCell(NOM).text;

        // On cherche les lignes avec les vraies données
        if (nom === 'Nom Structure') {
          continue;
        }

        if (/^\s*$/.test(nom)) {
          continue;
        }

        await processStructure({
          fichier: f, // Nom du fichier, pour log et audit
          ligne: i + 1, // Ligne dans le fichier Excel, pour log et audit
          id: ~~row.getCell(ID).value,
          siret: row.getCell(SIRET).text,
          nom: row.getCell(NOM).text,
          codePostal: row.getCell(CODE_POSTAL).text,
          ville: row.getCell(VILLE).text,
          email: row.getCell(EMAIL).text,
          labelFranceServices: row.getCell(INTERVENTION_FRANCE_SERVICES).value,
          interventionZRR: row.getCell(INTERVENTION_ZRR).value,
          interventionQPV: row.getCell(INTERVENTION_QPV).value,
          codesQPV: row.getCell(CODES_QPV).value,
          nomsQuartiersQPV: row.getCell(NOMS_QUARTIERS_QPV).value,
          nombreConseillers: ~~row.getCell(NOMBRE_CONSEILLERS).value,
          avis: row.getCell(AVIS).value,
          commentaire: row.getCell(COMMENTAIRE).text,
        });
      }
    }
  };

  if (program.repertoire) {
    const arrayOfFiles = fs.readdirSync(program.repertoire);
    for (const f of arrayOfFiles) {
      // Seulement les fichiers Excel en xlsx
      if (!/xlsx$/.test(f)) {
        continue;
      }
      await readExcelForDep(path.resolve(program.repertoire, f));
    }
  }

  if (program.file) {
    await readExcelForDep(program.file);
  }
});

