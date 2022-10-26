#!/usr/bin/env node
'use strict';

const axios = require('axios');
const { ObjectId } = require('mongodb');
const { execute } = require('../../utils');
const { program } = require('commander');
const { getStructureIdsOldUrl, isValidObjectId } = require('./populate-rdv-aide-numerique.utils');

program.parse(process.argv);

execute(__filename, async ({ db, app, logger, Sentry }) => {

  await new Promise(async resolve => {

    try {

      const apiRdv = app.get('api_rdv_aide_num');
      const resultApiRdv = await axios.get(apiRdv);
      const urls = resultApiRdv?.data?.public_links;

      if (Array.isArray(urls) && urls?.length > 0) {

        // Suppression urls structure en base si n'apparaissent plus côté RDV Aide Num
        const structuresWithUrl = await db.collection('structures').find({ urlPriseRdv: { $exists: true } }).project({ _id: 1 }).toArray();
        const structureIdsOldUrl = getStructureIdsOldUrl(urls, structuresWithUrl);

        if (structureIdsOldUrl.length > 0) {
          await db.collection('structures').updateMany(
            { _id: { $in: structureIdsOldUrl } },
            { $unset: { urlPriseRdv: '' } });
          logger.info(`Suppression d'urls obsolètes pour structure Id(s) : ${structureIdsOldUrl}`);
        }

        // Ajout ou maj des urls
        let promises = [];
        let nok = 0;
        let ok = 0;

        urls.forEach(url => {
          promises.push(new Promise(async (resolve, reject) => {

            if (!isValidObjectId(url.external_id)) {
              logger.warn(`Id structure incorrect : ${url.external_id}`);
              reject();
              nok++;
              return;
            }

            const structure = await db.collection('structures').findOne({ _id: new ObjectId(url.external_id) });

            if (structure === null) {
              logger.warn(`Structure introuvable avec id : ${url.external_id}`);
              reject();
              nok++;
              return;
            }

            if (url.public_link === structure.urlPriseRdv) {
              logger.info(`URL déjà présente et identique pour la structure : ${url.external_id}`);
              reject();
              nok++;
              return;
            }

            await db.collection('structures').updateOne(
              { _id: structure._id },
              { $set: { urlPriseRdv: url.public_link } });

            logger.info(`URL mise à jour pour la structure : ${url.external_id}`);
            ok++;
            resolve();
          }));
        });
        await Promise.allSettled(promises);

        logger.info(`**Résultats : ${ok} OK / ${nok} NOK**`);
      }
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e);
    }
    resolve();
  });

});
