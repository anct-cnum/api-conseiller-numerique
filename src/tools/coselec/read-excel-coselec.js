#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const ExcelJS = require('exceljs');

program
.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

execute(__filename, async ({ db, logger }) => {
  let avisPositif = 0;

  const processStructure = async s => {
    const match = await db.collection('structures').findOne({ idPG: s.id });

    // Si on a un id
    if (s.id !== null && match) {
      logger.info(`OKID,${s.id},${s.siret}`);

      const filter = { idPG: s.id };
      const updateDoc = {
        $set: {
          updatedAt: new Date(),
        },
        $push: {
          coselec: {
            nombreConseillersCoselec: s.nombreConseillersCoselec,
            avisCoselec: s.avisCoselec,
            observationsReferent: s.observationsReferent,
            prioritaireCoselec: s.prioritaireCoselec,
            numero: s.numeroCoselec,
            insertedAt: new Date()
          },
        }
      };

      // xxx Vérifier le SIRET avec l'API Entreprise
      //      if (/^\d{14}$/.test(s.siret)) {
      //updateDoc.$set = { ...updateDoc.$set, ...{ siret: s.siret } };
      //}

      if (s.avisCoselec === 'POSITIF') {
        updateDoc.$set = { ...updateDoc.$set, ...{ statut: 'VALIDATION_COSELEC', coselecAt: new Date() } };
        avisPositif++;
        logger.info(`OKPOSITIF,${s.id},${s.siret}`);
      }

      const result = await db.collection('structures').updateOne(filter, updateDoc);

      logger.info(`OKUPDATE,${s.id},${s.siret},${result.matchedCount},${result.modifiedCount}`);
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // xxx Vérifier le SIRET avec l'API Entreprise
      logger.info(`OKSIRET,${s.id},${s.siret}`);

      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret });

      if (match) {
        const filter = { siret: s.siret };
        const updateDoc = {
          $set: {
            updatedAt: new Date(),
          },
          $push: {
            coselec: {
              nombreConseillersCoselec: s.nombreConseillersCoselec,
              avisCoselec: s.avisCoselec,
              observationsReferent: s.observationsReferent,
              prioritaireCoselec: s.prioritaireCoselec,
              numero: s.numeroCoselec,
              insertedAt: new Date()
            },
          }
        };

        if (s.avisCoselec === 'POSITIF') {
          updateDoc.$set = { ...updateDoc.$set, ...{ statut: 'VALIDATION_COSELEC', coselecAt: new Date() } };
          avisPositif++;
          logger.info(`OKPOSITIF,${s.id},${s.siret}`);
        }

        const result = await db.collection('structures').updateOne(filter, updateDoc);

        logger.info(`OKUPDATE,${s.id},${s.siret},${result.matchedCount},${result.modifiedCount}`);
      }
    } else {
      logger.info(`KO,${s.id},${s.siret},${s.nom}`);
    }
  };

  const readExcel = async file => {
    const start = 2; // Début de la liste des structures

    // Colonnes Excel
    const ID = 1;
    const SIRET = 2;
    const NOM = 3;
    const LABEL_FRANCE_SERVICES = 10;
    const NOMBRE_CONSEILLERS = 11;
    const AVIS = 12;
    const COMMENTAIRE = 13;
    const OBSERVATIONS_REFERENT = 14;
    const AVIS_COSELEC = 16;
    const NOMBRE_CONSEILLERS_COSELEC = 17;
    const PRIORITAIRE_COSELEC = 18;
    const NUMERO_COSELEC = 19;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file);

    for await (const worksheetReader of workbookReader) {
      if (worksheetReader.name !== 'Structures') {
        continue;
      }

      let i = 0;
      for await (const row of worksheetReader) {
        if (++i < start) {
          continue;
        }

        let id = row.getCell(ID).value;
        let siret = row.getCell(SIRET).value;

        if (!/^\d+$/.test(id) && !/^\d{14}$/.test(siret)) {
          continue;
        }

        await processStructure({
          id: !/^0$/.test(row.getCell(ID).value) ? ~~row.getCell(ID).value : null,
          siret: /^\d{14}$/.test(row.getCell(SIRET).value) ? String(row.getCell(SIRET).value) : null,
          nom: row.getCell(NOM).value, // Juste pour loguer si pas trouvée avec id et siret
          labelFranceServices: /^OUI|NON$/.test(row.getCell(LABEL_FRANCE_SERVICES).value) ? (row.getCell(LABEL_FRANCE_SERVICES).value === 'OUI') : null,
          nombreConseillers: /^\d+$/.test(row.getCell(NOMBRE_CONSEILLERS).value) ? row.getCell(NOMBRE_CONSEILLERS).value : 0,
          avis: row.getCell(AVIS).value,
          commentaire: !/^0$/.test(row.getCell(COMMENTAIRE).value) ? row.getCell(COMMENTAIRE).value : '',
          avisCoselec: /^POSITIF|NÉGATIF|EXAMEN COMPLÉMENTAIRE$/.test(row.getCell(AVIS_COSELEC).value) ? row.getCell(AVIS_COSELEC).value : null,
          nombreConseillersCoselec: /^\d+$/.test(row.getCell(NOMBRE_CONSEILLERS_COSELEC).value) ? row.getCell(NOMBRE_CONSEILLERS_COSELEC).value : 0,
          observationsReferent: !/^0$/.test(row.getCell(OBSERVATIONS_REFERENT).value) ? row.getCell(OBSERVATIONS_REFERENT).value : '',
          prioritaireCoselec: /^OUI|NON$/.test(row.getCell(PRIORITAIRE_COSELEC).value) ? (row.getCell(PRIORITAIRE_COSELEC).value === 'OUI') : null,
          numeroCoselec: !/^0$/.test(row.getCell(NUMERO_COSELEC).value) ? row.getCell(NUMERO_COSELEC).value : '',
        });
      }
    }
  };

  await readExcel(program.file);
  logger.info(`Nombre d'avis POSITIF ${avisPositif}`);
});

