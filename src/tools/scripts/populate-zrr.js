#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../utils');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

// CSV ZRR
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

execute(async ({ db, logger }) => {
  const store = async (s, isZRR) => {
    const filter = {
      '_id': s._id,
    };

    const updateDoc = {
      $set: {
        estZRR: isZRR
      }
    };

    const options = { };

    const result = await db.collection('structures').updateOne(filter, updateDoc, options);

    logger.info(
      `zrr,OK,${s._id},${s.idPG},${s.nom},${s.codeCommune},` +
      `${result.matchedCount},${result.modifiedCount}`
    );
  };

  const csv = await readCSV(program.csv);
  const zrr = csv
  .filter(v => v.ZRR_SIMP === 'C - Classée en ZRR')
  .map(v => v.CODGEO);

  logger.info(zrr);
  logger.info(zrr.length);

  // Chercher les structures dont on n'a pas encore les infos de ZRR
  // On utilise le code commune principal si dispo
  const matchCodeCommune = await db.collection('structures').find({
    codeCommune: { $ne: '' },
    zrr: { '$exists': false }
  });

  let s;
  while ((s = await matchCodeCommune.next())) {
    await store(s, zrr.includes(s.codeCommune));
  }

  // On utilise le code commune INSEE
  const matchSansCodeCommune = await db.collection('structures').find({
    codeCommune: { $eq: '' },
    zrr: { '$exists': false }
  });

  while ((s = await matchSansCodeCommune.next())) {
    if (s?.insee?.etablissement?.commune_implantation?.code) {
      await store(s, zrr.includes(s.insee.etablissement.commune_implantation.code));
    }
  }
});
