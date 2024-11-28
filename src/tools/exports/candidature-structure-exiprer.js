#!/usr/bin/env node
"use strict";
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");

const { execute } = require("../utils");

// node src/tools/exports/candidature-structure-exiprer.js

execute(__filename, async ({ logger, db }) => {
  const date = new Date("2023-12-31");
  const structuresExpired = await db
    .collection("structures")
    .find({
      statut: {
        $in: ["CREEE", "EXAMEN_COMPLEMENTAIRE_COSELEC"],
      },
      coordinateurCandidature: false,
      createdAt: { $lte: date },
      "coselec.nombreConseillersCoselec": { $nin: [1] },
    })
    .toArray();

  let promises = [];

  logger.info(
    `${structuresExpired.length} structure(s) qui ont candidater avant ${date}`
  );
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(
    __dirname,
    "../../../data/exports",
    "structures_expired.csv"
  );

  let file = fs.createWriteStream(csvFile, {
    flags: "w",
  });

  file.write(
    "idPG;nom de la structure;siret;Date de candidature;Email de contact\n"
  );
  structuresExpired.forEach((structure) => {
    promises.push(
      new Promise(async (resolve) => {
        file.write(
          `${structure.idPG};${structure.nom};${structure.siret};${dayjs(
            structure.createdAt
          ).format("DD/MM/YYYY")};${structure.contact.email};\n`
        );
        resolve();
      })
    );
  });
  await Promise.all(promises);
  file.close();
});
