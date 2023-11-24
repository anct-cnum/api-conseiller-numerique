#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/fixTagDateFinFormation.js

execute(__filename, async ({ logger, db }) => {
  const countConseiller = await db.collection('conseillers').countDocuments({ dateFinDeFormation: { $exists: true } });

  logger.info(
    `Rattrapage du tag dateFinDeFormation , à conserver dateFinFormation => ${countConseiller}...`
  );
  await db.collection('conseillers').updateMany(
    {
      dateFinDeFormation: { $exists: true },
      dateFinFormation: { $exists: true },
    },
    { $unset: { dateFinDeFormation: '' } }
  );
  await db.collection('conseillers').updateMany(
    { dateFinDeFormation: { $exists: true } },
    { $rename: { 'dateFinDeFormation': 'dateFinFormation' } }
  );
  const countRestantConseiller = await db.collection('conseillers').countDocuments({ dateFinDeFormation: { $exists: true } });
  logger.info(
    `Rattrapage terminé => ${countRestantConseiller} restants...`
  );
});
