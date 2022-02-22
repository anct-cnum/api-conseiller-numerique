#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { createMailbox, getMailBox } = require('../../utils/mailbox');
const { createAccount, loginAPI, searchUser } = require('../../utils/mattermost');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

execute(__filename, async ({ logger, db, app, Sentry, exit }) => {
  program.option('-c, --csv ', 'export des conseillers qui ont un faux compte activer en csv');
  program.option('-f, --fix ', 'correction des faux comptes activé');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const { csv, fix } = program;
  if (!csv && !fix) {
    exit('Paramètres invalides. Veuillez choisir entre --csv ou --fix');
    return;
  }
  let countConseiller = 0;
  let countNotGandi = 0;
  let countNotMattermost = 0;
  const gandi = app.get('gandi');
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const passwordcreatedTrue = await db.collection('users').find({ 'roles': { $in: ['conseiller'] }, 'passwordCreated': true }).toArray();
  let csvFile = path.join(__dirname, '../../../data/exports', 'faux_compte_coop_activer.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  if (csv) {
    logger.info(`Generating CSV file...`);
    file.write('Nom; Prénom; Email Personnelle des conseillers\n');
  }

  for (const cnfs of passwordcreatedTrue) {
    try {
      const conseiller = await db.collection('conseillers').findOne({
        _id: cnfs.entity.oid,
        statut: 'RECRUTE',
        mattermost: { $exists: false },
        emailCN: { $exists: false }
      });
      if (conseiller) {
        if (csv) {
          file.write(`${conseiller?.nom};${conseiller?.prenom};${conseiller?.email}\n`);
        }
        if (fix) {
          const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
          const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
          const login = `${prenom}.${nom}`;
          const password = uuidv4() + 'AZEdsf;+:';
          const conseillerId = conseiller._id;
          const email = `${login}@${gandi.domain}`;
          const { data } = await getMailBox({ gandi, login });
          if (data.length === 0) {
            await createMailbox({ gandi, db, logger, Sentry })({ conseillerId, login, password });
            await db.collection('users').updateOne({ 'entity.$id': conseillerId },
              { $set:
                  { name: `${login}@${gandi.domain}` }
              });
            countNotGandi++;
          }
          const result = await searchUser(mattermost, token, conseiller);
          if (result.data.length === 0) {
            await createAccount({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry });
            countNotMattermost++;
          }
          countConseiller++;
          logger.info(`Conseiller ${conseiller.idPG} corrigé par le script de "FauxCompteCoop.js"`);
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Gandi API
    await sleep(500);
  }
  logger.info(`${countConseiller} conseillers qui n'ont pas activer leurs espace via l'email d'invit COOP`);
  logger.info(`${countNotGandi} email @conseiller-numerique.fr corrigé(s)`);
  logger.info(`${countNotMattermost} compte mattermost corrigé(s)`);
  if (csv) {
    file.close();
  }
});
