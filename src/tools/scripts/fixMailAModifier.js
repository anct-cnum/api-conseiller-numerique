#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/fixMailAModifier.js

execute(__filename, async ({ logger, db, Sentry }) => {
  try {
    const conseillers = await db.collection('conseillers').find(
      {
        $or: [
          { tokenChangementMailProCreatedAt: { $lte: new Date('2023-12-31') } },
          { tokenChangementMailCreatedAt: { $lte: new Date('2023-12-31') } }
        ]
      }
    );
    for (const conseiller of conseillers) {
      let listUnset = {};
      let listSet = {};
      if (conseiller?.tokenChangementMail) {
        listSet = {
          ...listSet,
          email: conseiller.mailAModifier,
        };
        listUnset = {
          ...listUnset,
          mailAModifier: '',
          tokenChangementMail: '',
          tokenChangementMailCreatedAt: ''
        };
      }
      if (conseiller?.tokenChangementMailPro) {
        listSet = {
          ...listSet,
          emailPro: conseiller.mailProAModifier
        };
        listUnset = {
          ...listUnset,
          mailProAModifier: '',
          tokenChangementMailPro: '',
          tokenChangementMailProCreatedAt: '',
        };
      }

      await db.collection('conseillers').updateOne(
        { _id: conseiller._id },
        { $set: { listUnset } },
        { $unset: { listUnset } }
      );
    }
    logger.info(
      `Rattrapage des ${conseillers.length} conseillers qui n'ont pas confirmer leurs webmail avec succèss`
    );
  } catch (error) {
    logger.info(error);
    Sentry.captureException(error);
  }
});
