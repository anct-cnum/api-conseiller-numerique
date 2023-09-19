#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');


// Passer le script src\tools\admin\conseillers\fix-mises-en-relation.js après coup
execute(__filename, async ({ db, logger, exit, Sentry }) => {
  try {
    await db.collection('structures').updateMany({ }, {
      $unset: {
        inseeV2: '',
      },
    });
    logger.info('Fin de suppression des inseeV2');
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
