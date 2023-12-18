#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const { program } = require('commander');

execute(__filename, async ({ db, logger, exit }) => {
  program.option('-i, --id <id>', 'id: idPG du conseiller');
  program.option('-r, --reset', 'reset du coordo');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { id, reset } = program;
  const conseiller = await db.collection('conseillers').findOne({ idPG: ~~id });
  if (!conseiller) {
    logger.error(`Le conseiller ${~~id} n'existe pas`);
    return;
  }
  // CONSTAT du coordo ciblé
  const coordoOfficiel = await db.collection('structures').distinct('demandesCoordinateur.miseEnRelationId');
  const contratFinalisee = await db.collection('misesEnRelation').findOne({ 'statut': 'finalisee', 'conseiller.$id': conseiller._id });
  const statut = coordoOfficiel.map(i => String(i)).includes(String(contratFinalisee?._id)) ? 'officiel' : 'demi-officiel';
  const maille = [
    { type: 'codeRegion', message: `à la maille Régionale ${conseiller?.listeSubordonnes?.liste}` },
    { type: 'codeDepartement', message: `à la maille Départementale ${conseiller?.listeSubordonnes?.liste}` },
    { type: 'conseillers', message: `avec une liste custom => aux total ${conseiller?.listeSubordonnes?.liste.length} conseillers` },
  ];
  logger.info(`- Le conseiller ${conseiller.emailCN.address} est un coordo ${statut} rattaché à la SA ${contratFinalisee.structureObj.nom}`);
  logger.info(`=> Qui coordonne : ${maille.find(i => i.type === conseiller?.listeSubordonnes?.type)?.message ?? 'personnes...'}`);


  if (statut === 'demi-officiel' && reset) {
    // Role
    await db.collection('users').updateOne(
      { name: conseiller.emailCN.address },
      { $pull: { 'roles': 'coordinateur_coop' } }
    );
    // estCoordinateur
    await db.collection('conseillers').updateOne(
      { _id: conseiller._id },
      { $unset: { 'estCoordinateur': '', 'listeSubordonnes': '' } },
    );
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $unset: { 'conseillerObj.estCoordinateur': '', 'conseillerObj.listeSubordonnes': '' } },
    );
    // tag coordinateurs
    await db.collection('conseillers').updateMany(
      { 'coordinateurs': { $elemMatch: { id: conseiller._id } } },
      { $pull: { 'coordinateurs': { id: conseiller._id } } }
    );
    await db.collection('misesEnRelation').updateMany(
      { 'conseillerObj.coordinateurs': { $elemMatch: { id: conseiller._id } } },
      { $pull: { 'conseillerObj.coordinateurs': { id: conseiller._id } } }
    );
  }

  logger.info(`${(reset && statut === 'demi-officiel') ? `Fin de la purge du conseiller ${~~id}` : `Fin du constat ${~~id}`}`);
  exit();
});
