#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/migrationConumEspaceCandidat.js

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db
  .collection('conseillers')
  .distinct('_id', { statut: 'RECRUTE' });
  const users = await db
  .collection('users')
  .find({ 'entity.$id': { $in: conseillers } })
  .toArray();
  let countDoublon = 0;
  let countConflict = 0;
  let countNotModif = 0;
  let idDoublon = [];
  let idConflict = [];
  let idNotModif = [];
  let countModifOK = 0;
  let promises = [];

  logger.info(
    'Mise à jour de l\'identifiant prenom.nom@conseiller-numerique.fr par le mail personnelle...'
  );

  users.forEach(user => {
    promises.push(
      new Promise(async resolve => {
        const conseiller = await db
        .collection('conseillers')
        .findOne({ _id: user.entity.oid });
        const checkUserExist = await db.collection('users').findOne({
          'name': conseiller.email,
          'entity.$id': { $ne: user.entity.oid },
        });
        if (checkUserExist?.roles[0] === 'candidat') {
          idDoublon.push(
            `Doublon candidat ${conseiller.email} id: ${checkUserExist.entity.oid} avec le role => ${checkUserExist.roles} - On conserve ${user.entity.oid}`
          );
          await db
          .collection('users')
          .deleteOne({ _id: checkUserExist._id });
          await db
          .collection('conseillers')
          .updateOne(
            { _id: checkUserExist.entity.oid },
            { $set: { userCreated: false } }
          );
          await db
          .collection('users')
          .updateOne({ _id: user._id }, { $set: { name: conseiller.email } });
          countModifOK++;
          countDoublon++;
        } else if (checkUserExist && checkUserExist?.roles[0] !== 'candidat') {
          idConflict.push(
            `Doublon autre rôle ${conseiller.email} (idPG: ${conseiller.idPG}) id: ${checkUserExist.entity?.oid} avec le role => ${checkUserExist.roles} - A corriger`
          );
          countConflict++;
        } else if (conseiller.email === user.name) {
          idNotModif.push(
            `${conseiller.email} déjà OK pour le conseiller ${conseiller.idPG}`
          );
          countNotModif++;
        } else {
          await db
          .collection('users')
          .updateOne({ _id: user._id }, { $set: { name: conseiller.email } });
          countModifOK++;
        }
        resolve();
      })
    );
  });
  await Promise.all(promises);
  logger.info(`${idNotModif.map(log => `- ${log} \r\n`)} \r\n
    ${idDoublon.map(log => `- ${log} \r\n`)} \r\n
    ${idConflict.map(log => `- ${log} \r\n`)} \r\n
    ${countModifOK} conseiller(s) mis à jour avec ${countDoublon} en doublon, ${countConflict} en conflict & ${countNotModif} déjà ok (${countModifOK + countConflict + countNotModif} / ${users.length})`);
});
