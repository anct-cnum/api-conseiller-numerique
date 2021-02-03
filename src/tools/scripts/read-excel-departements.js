#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const ExcelJS = require('exceljs');
program.version('0.0.1');

program
.option('-d, --departement <departement>', 'département')
.option('-v, --vague <vague>', 'vague')
.option('-w, --revision <revision>', 'révision')
.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

// Liste des départements
const departements = require('./departements-region.json');
const deps = new Map();
for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

execute(async ({ feathers, db, logger, exit }) => {
  const processStructure = async s => {
    //await logger.info(s.email);
    const match = await db.collection('structures').findOne({ idPG: s.id});
    // xxx mode dryrun pour valider le fichier Excel

    // Si on a un id
    if (match) {
      const filter = { idPG: s.id};
      const updateDoc = {
        $set: {
          siret: s.siret,
          labelFranceServices: s.labelFranceServices,
          nombreConseillersSouhaites: s.nombreConseillers,
          avis: s.avis,
          commentaire: s.commentaire,
          statut: 'PREFET',
        },
      };

      const result = await db.collection('structures').updateOne(filter, updateDoc);
      logger.info(
        `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
      );
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret});

      if (match) {
        const filter = { siret: s.siret};
        const updateDoc = {
          $set: {
            labelFranceServices: s.labelFranceServices,
            nombreConseillersSouhaites: s.nombreConseillers,
            avis: s.avis,
            commentaire: s.commentaire
            statut: 'PREFET',
          },
        };

        const result = await db.collection('structures').updateOne(filter, updateDoc);
        logger.info(
          `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
        );
      }
  };

  const readExcelForAllDeps = async () => {
    for (const d of departements) {
      await readExcelForDep(d.num_dep);
    }
  };

  const readExcelForDep = async (departement) => {
    const start = 13; // Début de la liste des structures

    // Colonnes Excel
    const ID = 1;
    const SIRET = 2;
    const NOM = 3;
    const CODE_POSTAL = 4;
    const VILLE = 5;
    const EMAIL = 6;
    const LABEL_FRANCE_SERVICES = 7;
    const NOMBRE_CONSEILLERS = 8;
    const AVIS = 9;
    const COMMENTAIRE = 10;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(program.file); // xxx utiliser le departement+version
    for await (const worksheetReader of workbookReader) {
      let i=0;
      for await (const row of worksheetReader) {
        if (++i<start) continue;
        let id = row.getCell(ID).value;
        if (!/^\d+$/.test(id)) continue;

        await processStructure({
          id: row.getCell(ID).value,
          siret: row.getCell(SIRET).value,
          nom: row.getCell(NOM).value,
          codePostal: row.getCell(CODE_POSTAL).value,
          ville: row.getCell(VILLE).value,
          email: row.getCell(EMAIL).value,
          labelFranceServices: row.getCell(LABEL_FRANCE_SERVICES).value,
          nombreConseillers: row.getCell(NOMBRE_CONSEILLERS).value,
          avis: row.getCell(AVIS).value,
          commentaire: row.getCell(COMMENTAIRE).value,
        });
        //logger.info(`${row.getCell(ID).value} ${row.getCell(EMAIL).value} ${row.getCell(LABEL_FRANCE_SERVICE).value} ${row.getCell(NOMBRE_CONSEILLERS).value} ${row.getCell(AVIS).value} ${row.getCell(COMMENTAIRE).value}`);
      }
    }
  };


  if (program.departement) {
    await readExcelForDep(program.departement);
  } else {
    //await readExcelForAllDeps();
  }
});

