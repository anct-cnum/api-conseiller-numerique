#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');


execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCNFS = program.id;
  let ancienneSA = program.ancienne;
  let nouvelleSA = program.nouvelle;

  if (!idCNFS || !ancienneSA || !nouvelleSA) {
    exit('Paramètres invalides. Veuillez préciser un id du conseiller ainsi qu\'un id de la structure actuelle; un id de la structure destinataire et la date');
    return;
  }

  idCNFS = new ObjectID(program.id);
  ancienneSA = new ObjectID(program.ancienne);
  nouvelleSA = new ObjectID(program.nouvelle);

  const cnfsRecrute = await db.collection('misesEnRelation').findOne({
    'conseiller.$id': idCNFS, 'structure.$id': ancienneSA,
    'statut': { '$in': ['finalisee', 'nouvelle_rupture', 'finalisee_rupture'] }
  });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${idCNFS} n'est pas recruté.`);
    return;
  }
  if (cnfsRecrute?.statut === 'nouvelle_rupture') {
    exit(`Rupture non validé par un Admin`);
    return;
  }
  if (cnfsRecrute?.statut === 'finalisee_rupture') {
    await db.collection('misesEnRelation').updateOne(
      { _id: cnfsRecrute?._id },
      { $set: { 'structure.$id': nouvelleSA }
      });
    await db.collection('conseillers').updateOne(
      { _id: idCNFS },
      { $set: { 'ruptures.$.structureId': nouvelleSA } // A tester
      });
    await db.collection('conseillersRuptures').updateOne(
      { 'conseillerId': idCNFS, 'structureId': ancienneSA },
      { $set: { 'structureId': nouvelleSA } // A tester
      });
    return;
  }
  if (cnfsRecrute?.statut === 'finalisee_rupture') {
    const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });

    if (structureDestination?.statut !== 'VALIDATION_COSELEC') {
      exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
      return;
    }
    let dernierCoselec = utils.getCoselec(structureDestination);
    const misesEnRelationRecrutees = await db.collection('misesEnRelation').countDocuments({
      'statut': { $in: ['recrutee', 'finalisee'] },
      'structure.$id': structureDestination._id
    });
    if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec) {
    //eslint-disable-next-line max-len
      exit(`La structure destinataire est seulement autorisé  à avoir ${dernierCoselec.nombreConseillersCoselec} conseillers et en a déjà ${misesEnRelationRecrutees} validé(s)/recrutée(s)`);
      return;
    }
    // eslint-disable-next-line max-len
    if (cnfsRecrute?.codeRegionStructure !== structureDestination?.codeRegion || cnfsRecrute?.codeDepartementStructure !== structureDestination?.codeDepartement) {
      // eslint-disable-next-line max-len
      logger.warn(`Une différence de departement ou région a été détecté ! Region:${cnfsRecrute?.codeRegionStructure} vs ${structureDestination?.codeRegion} / departement: ${cnfsRecrute.codeDepartementStructure} vs ${structureDestination?.codeDepartement}`);
    }
    await db.collection('conseillers').updateOne({ _id: idCNFS }, { $set: { structureId: nouvelleSA } });
    await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj.structureId': nouvelleSA } });

    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA },
      { $set: {
        statut: cnfsRecrute?.conseillerObj?.disponible === false ? 'finalisee_non_disponible' : 'nouvelle',
        fusion: {
          'destinationStructureId': nouvelleSA,
          'date': new Date()
        }
      }
      });

    const misesEnrelationNouvelleSA = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA });
    const fusion = {
      'ancienneStructureId': ancienneSA,
      'date': new Date()
    };

    if (!misesEnrelationNouvelleSA) {
      const connection = app.get('mongodb');
      const database = connection.substr(connection.lastIndexOf('/') + 1);
      const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
      const structure = await db.collection('structures').findOne({ _id: nouvelleSA });

      await db.collection('misesEnRelation').insertOne({
        conseiller: new DBRef('conseillers', idCNFS, database),
        structure: new DBRef('structures', nouvelleSA, database),
        statut: 'finalisee',
        distance: cnfsRecrute?.distance,
        createdAt: new Date(),
        conseillerObj: conseiller,
        structureObj: structure,
        dateRecrutement: cnfsRecrute?.dateRecrutement,
        fusion
      });
    } else {
      await db.collection('misesEnRelation').updateOne(
        { 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA },
        { $set: {
          statut: 'finalisee',
          dateRecrutement: cnfsRecrute?.dateRecrutement,
          fusion
        }
        });
    }
    // Partie CRAS
    await db.collection('cras').updateMany(
      { 'conseiller.$id': idCNFS,
        'structure.$id': ancienneSA
      }, {
        $set: { 'structure.$id': nouvelleSA }
      });
    // Partie Permanence
    const getPermAncienneSA = await db.collection('permanences').find(
      { 'conseillers': { $in: idCNFS }, 'structure.$id': ancienneSA, 'adresse.codeCommune': { '$exists': true } },
    ).toArray();
    const getPermNouvelleSA = await db.collection('permanences').find(
      { 'structure.$id': nouvelleSA },
    ).toArray();

    for (let permanence of getPermAncienneSA) {
    // eslint-disable-next-line max-len
      const verifDoublon = getPermNouvelleSA.filter(i => i.location?.coordinates === permanence.location?.coordinates && i.adresse?.rue === permanence.adresse?.rue);
      if (verifDoublon.length === 0) { // si pas de doublon
        if (permanence.conseillers.length === 1) { // si 1 seule CN dans conseillers
          await db.collection('permanences').updateOne(
            { _id: permanence?._id },
            { $set: { 'structure.$id': nouvelleSA } }
          );
          return;
        }
        // si plusieurs CN se trouve dans la perm plusiuers id dans conseillers
        await db.collection('permanences').updateOne(
          { _id: permanence?._id },
          { $pull: { conseillers: idCNFS, conseillersItinerants: idCNFS, lieuPrincipalPour: idCNFS } }
        );
        delete permanence._id;
        const insertPermanence = {
          ...permanence,
          'conseillers': [idCNFS],
          'conseillersItinerants': permanence.conseillersItinerants.filter(i => String(i) === String(idCNFS)),
          'lieuPrincipalPour': permanence.lieuPrincipalPour.filter(i => String(i) === String(idCNFS)),
          'structure.$id': nouvelleSA,
          'updatedBy': idCNFS,
          'updatedAt': new Date()
        };
        const permnouvelleSA = await db.collection('permanences').insertOne(insertPermanence);
        await db.collection('cras').updateMany(
          { 'permanence.$id': permanence?._id, 'conseiller.$id': idCNFS },
          { $set: { 'permanence.$id': permnouvelleSA?._id } }
        );
      } else { // si il y a un doublon
        await db.collection('permanences').updateOne(
          { _id: permanence?._id },
          { $pull: { conseillers: idCNFS, conseillersItinerants: idCNFS, lieuPrincipalPour: idCNFS } }
        );
        await db.collection('permanences').updateOne(
          { _id: verifDoublon[0]?._id },
          { $push: { conseillers: idCNFS } }
        );
        await db.collection('cras').updateMany(
          { 'permanence.$id': permanence?._id, 'conseiller.$id': idCNFS },
          { $set: { 'permanence.$id': verifDoublon[0]?._id } }
        );
      }
    }
    const getPermAncienneSARestante = await db.collection('permanences').find(
      { 'conseillers': { $in: idCNFS }, 'structure.$id': ancienneSA }
    ).toArray();
    logger.info(`Il reste ${getPermAncienneSARestante.length} permanences à traiter`);
  }
  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${ancienneSA} vers la structure: ${nouvelleSA} (FUSION)`);
  exit();
});
