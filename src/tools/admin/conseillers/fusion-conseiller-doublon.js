#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { ObjectID } = require('mongodb');

// node src/tools/admin/conseillers/fusion-conseiller-doublon.js --id XXX --conseiller XXX

execute(__filename, async ({ db, logger, exit }) => {
  program.option('-i, --id <id>', 'id: id Mongo du profil en erreur');
  program.option('-c, --conseiller <conseiller>', 'conseiller: id Mongo du profil actif');
  program.option('-ig, --ignored', 'ignored: ignorer la partie controle éligibilité'); // A utiliser uniquement si on est sure que c'est le meme user
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const idCnRupture = new ObjectID(program.id);
  const idCnActif = new ObjectID(program.conseiller);
  const ignored = program.ignored;

  try {
    const conseillerRupture = await db.collection('conseillers').findOne({ _id: idCnRupture, statut: 'RUPTURE' });
    const conseillerActif = await db.collection('conseillers').findOne({ _id: idCnActif, statut: 'RECRUTE' });
    if (!conseillerRupture || !conseillerActif) {
      // affiche null si CN non trouvé
      exit(`(${conseillerRupture?._id ?? conseillerRupture} ou ${conseillerActif?._id ?? conseillerActif}) => Non trouvé !`);
      return;
    }
    // Partie controle éligibilité :
    if (conseillerRupture?.email !== conseillerActif?.email && !ignored) {
      // eslint-disable-next-line max-len
      if ((conseillerRupture?.nom.toUpperCase() !== conseillerActif?.nom?.toUpperCase()) || (conseillerRupture?.prenom.toUpperCase() !== conseillerActif?.prenom.toUpperCase())) {
        // eslint-disable-next-line max-len
        exit(`Non éligible à la fusion de compte => ${conseillerRupture?.nom} ${conseillerRupture?.prenom} !== ${conseillerActif?.nom} ${conseillerActif?.prenom}`);
        return;
      }
    }
    // Partie Modification
    let ruptures = conseillerRupture.ruptures;
    if (conseillerActif?.ruptures) {
      ruptures = conseillerRupture.ruptures.concat(conseillerActif?.ruptures);
      ruptures.sort((a, b) => a.dateRupture - b.dateRupture);
    }
    await db.collection('conseillers').updateOne({ _id: idCnActif },
      { $set: { ruptures } });
    await db.collection('conseillersRuptures').updateOne(
      { 'conseillerId': idCnRupture },
      { $set: { 'conseillerId': idCnActif }
      });
    await db.collection('cras').updateMany(
      { 'conseiller.$id': idCnRupture }, {
        $set: { 'conseiller.$id': idCnActif }
      });
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
        dateFinFormation: '',
        datePrisePoste: '',
        certificationPixFormation: '',
        mailProAModifier: '',
        tokenChangementMailPro: '',
        tokenChangementMailProCreatedAt: '',
      } });
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCnRupture, 'statut': 'finalisee_rupture' },
      { $set: { 'conseiller.$id': idCnActif, 'conseillerObj': { ...conseillerActif, ruptures } }
      });
    logger.info(`Le profil id: ${idCnRupture} fusion avec le profil ${idCnActif} : terminé`);
  } catch (e) {
    logger.error(e.message);
  }
  exit();
});
