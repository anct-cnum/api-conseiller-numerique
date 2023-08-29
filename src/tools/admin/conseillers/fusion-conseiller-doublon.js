#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');

// node src/tools/admin/conseillers/fusion-conseiller-doublon.js

execute(__filename, async ({ db, logger, exit }) => {
  program.option('-i, --id <id>', 'id: id Mongo du profil en erreur');
  program.option('-c, --conseiller <conseiller>', 'conseiller: id Mongo du profil actif');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCnRupture = program.id;
  let idCnActif = program.conseiller;
  idCnRupture = new ObjectID(program.id);
  idCnActif = new ObjectID(program.id);
  try {
    const conseillerRupture = await db.collection('conseillers').findOne({ _id: idCnRupture, statut: 'RUPTURE' });
    const conseillerActif = await db.collection('conseillers').findOne({ _id: idCnActif, statut: 'RECRUTE' });
    // Partie controle éligibilité :
    if (!conseillerRupture || !conseillerActif) {
      exit(`(${conseillerRupture} ou ${conseillerActif}) => Non trouvé !`);
      return;
    }
    if (conseillerRupture?.email !== conseillerActif?.email) {
      if ((conseillerRupture?.nom !== conseillerActif?.nom) && (conseillerRupture?.prenom !== conseillerActif?.prenom)) {
        // eslint-disable-next-line max-len
        exit(`Non éligible à la fusion de compte => ${conseillerRupture?.nom} ${conseillerRupture?.prenom} !== ${conseillerActif?.nom} ${conseillerActif?.prenom}`);
        return;
      }
    }
    // Partie Modification
    await db.collection('conseillers').updateOne({ _id: idCnRupture },
      { $unset: {
        statut: '',
        ruptures: '',
        emailCN: '',
        mattermost: '',
        emailPro: '',
        estCoordinateur: '',
        telephonePro: '',
        supHierarchique: '',
        groupeCRAHistorique: '',
        groupeCRA: '',
      } });
    let ruptures = conseillerRupture.ruptures;
    if (conseillerActif?.ruptures) {
      ruptures = {
        ...conseillerRupture.ruptures,
        ...conseillerActif.ruptures
      };
      ruptures.sort((a, b) => a.dateRupture - b.dateRupture);
    }
    await db.collection('conseillers').updateOne({ _id: idCnActif },
      { $set: { ruptures } });
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCnRupture, 'statut': 'finalisee_rupture' },
      { $set: { 'conseiller.$id': idCnActif, 'conseillerObj': conseillerActif }
      });
    await db.collection('conseillersRuptures').updateOne(
      { 'conseillerId': idCnRupture },
      { $set: { 'conseillerId': idCnActif }
      });
    await db.collection('cras').updateMany(
      { 'conseiller.$id': idCnRupture }, {
        $set: { 'conseiller.$id': idCnActif }
      });

    logger.info(`Le profil id: ${idCnRupture} fusion avec le profil ${idCnActif} : terminé`);
  } catch (e) {

  }
  exit();
});
