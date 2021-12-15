#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { getMailBox, createMailbox } = require('../../utils/mailbox');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const miseAjourIdentifiant = (db, gandi) => async (conseillerId, login) => {
  await db.collection('users').updateOne({ 'entity.$id': conseillerId }, { $set: { name: `${login}@${gandi.domain}` } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseillerId },
    { $set:
            { 'conseillerObj.emailCNError': false,
              'conseillerObj.emailCN': { address: `${login}@${gandi.domain}` } }
    });
};
execute(__filename, async ({ logger, db, gandi, Sentry }) => {
  let fixMailBoxGandi = 0;
  let okEmailBoxGandi = 0;
  let errorEmailBoxGandi = 0;
  let idPGErrorEmailBoxGandi = [];
  let idPGSuccessEmailBoxGandi = [];
  const conseillers = await db.collection('conseillers').find({ emailCNError: { $exists: true }, statut: { $ne: 'RUPTURE' } }).toArray();

  logger.info('Fix des boites mail gandi non crée...');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  for (const conseiller of conseillers) {
    const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
    const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
    let login = conseiller?.emailCN?.address ? conseiller?.emailCN?.address.substring(0, conseiller?.emailCN?.address.lastIndexOf('@')) : `${prenom}.${nom}`;
    const conseillerId = conseiller._id;
    const password = uuidv4() + 'AZEdsf;+:';
    const { data } = await getMailBox({ gandi, login });

    if (data.length === 0) {
      // eslint-disable-next-line no-loop-func
      await createMailbox({ gandi, db, logger, Sentry })({ conseillerId, login, password }).then(result => {
        if (result) {
          fixMailBoxGandi++;
          idPGSuccessEmailBoxGandi.push(conseiller.idPG);
          logger.info(`mise à jour email gandi (script) ${conseiller.idPG}`);
          return miseAjourIdentifiant(db, gandi)(conseillerId, login);
        } else {
          idPGErrorEmailBoxGandi.push(conseiller.idPG);
          errorEmailBoxGandi++;
        }
      }).catch(error => {
        logger.error(error);
        Sentry.captureException(error);
      });
    } else {
      okEmailBoxGandi++;
    }

    await sleep(500);
  }
  // eslint-disable-next-line max-len
  logger.info(`${fixMailBoxGandi} boites mails corrigées, ${okEmailBoxGandi} déjà OK et ${errorEmailBoxGandi} en erreur`);
  logger.info(`Détails pour les ${fixMailBoxGandi} conseiller(s) corrigé(s) => [${idPGSuccessEmailBoxGandi}]`);
  logger.info(`Détails pour les ${errorEmailBoxGandi} conseiller(s) en erreur(s) => [${idPGErrorEmailBoxGandi}]`);
});
