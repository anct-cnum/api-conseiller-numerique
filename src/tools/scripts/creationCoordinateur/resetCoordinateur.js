#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const { program } = require('commander');

// node src/tools/scripts/creationCoordinateur/resetCoordinateur.js -i ID

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
  const user = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
  if (!user.roles.includes('coordinateur_coop') && !user.roles.includes('coordinateur')) {
    logger.error(`Le conseiller ${~~id} n'est pas un coordinateur`);
    return;
  }
  // CONSTAT du coordo ciblé
  const contratFinalisee = await db.collection('misesEnRelation').findOne({ 'statut': 'finalisee', 'conseiller.$id': conseiller._id });
  const coordoOfficiel = await db.collection('structures').countDocuments({ 'demandesCoordinateur.miseEnRelationId': contratFinalisee._id });
  const statut = coordoOfficiel > 0 ? 'officiel' : 'demi-officiel';

  const maille = [
    { type: 'codeRegion', message: `à la maille Régionale ${conseiller?.listeSubordonnes?.liste}` },
    { type: 'codeDepartement', message: `à la maille Départementale ${conseiller?.listeSubordonnes?.liste}` },
    { type: 'conseillers', message: `avec une liste custom => au total ${conseiller?.listeSubordonnes?.liste.length} conseillers` },
  ];
  // eslint-disable-next-line max-len
  logger.info(`- Le conseiller ${conseiller.emailCN.address} est un coordo ${statut} rattaché à la SA ${contratFinalisee.structureObj.nom} \r\n => Qui coordonne : ${maille.find(i => i.type === conseiller?.listeSubordonnes?.type)?.message ?? 'personnes...'}`);


  if (statut === 'demi-officiel' && reset) {
    // Role
    await db.collection('users').updateOne(
      { name: conseiller.emailCN.address },
      { $pull: { 'roles': { '$in': ['coordinateur_coop', 'coordinateur'] } } }
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

    await db.collection('conseillers').updateMany(
      { 'coordinateurs': { '$size': 0 } },
      { $unset: { 'coordinateurs': '' } },
    );
    await db.collection('misesEnRelation').updateMany(
      { 'conseillerObj.coordinateurs': { '$size': 0 } },
      { $unset: { 'conseillerObj.coordinateurs': '' } },
    );
  }

  logger.info(`${(reset && statut === 'demi-officiel') ? `Fin de la purge du conseiller ${~~id}` : `Fin du constat ${~~id}`}`);
  exit();
});
