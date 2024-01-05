#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const dayjs = require('dayjs');
const { Pool } = require('pg');
const pool = new Pool();

// node src/tools/scripts/fixMailAModifier.js

execute(__filename, async ({ logger, db, Sentry, app }) => {
  try {
    const date = dayjs(Date()).subtract(28, 'days').format('YYYY/MM/DD 23:59:59');
    const queryDate = new Date(date);
    const gandi = app.get('gandi');

    const conseillers = await db.collection('conseillers').find(
      {
        $or: [
          { tokenChangementMailProCreatedAt: { $lt: queryDate } },
          { tokenChangementMailCreatedAt: { $lt: queryDate } }
        ]
      }
    ).toArray();
    for (const conseiller of conseillers) {
      let listUnset = {};
      let listSet = {};
      if (conseiller?.tokenChangementMailCreatedAt < queryDate && !conseiller.mailAModifier.includes(gandi.domain)) {
        // Partie PG
        await pool.query(`UPDATE djapp_coach
        SET email = $2
            WHERE id = $1`,
        [conseiller.idPG, conseiller.mailAModifier.toLowerCase()]);

        listSet = {
          ...listSet,
          email: conseiller.mailAModifier.toLowerCase(),
        };
        listUnset = {
          ...listUnset,
          mailAModifier: '',
          tokenChangementMail: '',
          tokenChangementMailCreatedAt: ''
        };
      }
      if (conseiller?.tokenChangementMailProCreatedAt < queryDate) {
        listSet = {
          ...listSet,
          emailPro: conseiller.mailProAModifier.toLowerCase()
        };
        listUnset = {
          ...listUnset,
          mailProAModifier: '',
          tokenChangementMailPro: '',
          tokenChangementMailProCreatedAt: '',
        };
      }

      if (Object.values(listSet).length !== 0 && Object.values(listUnset).length !== 0) {
        await db.collection('conseillers').updateOne(
          { _id: conseiller._id },
          {
            $set: listSet,
            $unset: listUnset
          },
        );
      }
    }
    logger.info(
      `Rattrapage des ${conseillers.length} conseillers qui n'ont pas confirmer le mail de chg avec succès`
    );
  } catch (error) {
    logger.info(error);
    Sentry.captureException(error);
  }
});
