#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const {
  toSimpleMiseEnRelation,
  isRecrute,
  splitOnRecruteStatut,
  inspectUsersAssociatedWithConseillers,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId
} = require("./fixRelationshipsBetweenConseillersAndUsers.utils");
const {ObjectId} = require("mongodb");

const getConseillersIdsByEmail = async db =>  await db.collection('conseillers').aggregate(
  [
    {
      $group: {
        _id: '$email',
        conseillers: {
          $push: {
            id: '$_id',
            prenom: '$prenom',
            nom: '$nom',
            estRecrute: '$estRecrute',
            statut: '$statut',
            structureId: '$structureId',
            disponible: '$disponible',
            userCreated: '$userCreated',
            datePrisePoste: '$datePrisePoste',
            dateFinFormation: '$dateFinFormation',
            mattermost: '$mattermost',
            emailCN: '$emailCN',
            emailCNError: '$emailCNError',
          },
        }
      }
    }
  ]
).toArray();

const getMisesEnRelationsMatchingConseillerIdAndStructureId = async (db, conseillersId, structureId) => await db.collection('misesEnRelation')
  .find({
    'conseiller.$id': new ObjectId(conseillersId),
    'structure.$id': new ObjectId(structureId),
  })
  .map(toSimpleMiseEnRelation)
  .toArray();

const getMisesEnRelationsMatchingConseillerIdExceptStructureId = async (db, conseillersId, structureId) => await db.collection('misesEnRelation')
  .find({
    'conseiller.$id': new ObjectId(conseillersId),
    'structure.$id': {
      $ne: new ObjectId(structureId)
    }
  })
  .map(toSimpleMiseEnRelation)
  .toArray();


const getUserMatchingConseillerId = async (db, conseillersId) => await db.collection('users')
  .find({'entity.$id': ObjectId(conseillersId)})
  .toArray();

const getConseillersWithMatchingUsers = async (db, conseillersIdsByEmail) => await Promise.all(conseillersIdsByEmail.map(
  async (conseillerIdsByEmail) => ({
    users: await getUserMatchingConseillerId(db, conseillerIdsByEmail.conseillers[0].id),
    conseiller: conseillerIdsByEmail.conseillers[0]
  })
));

const getConseillersWithMatchingMiseEnRelationsOnStructureIdOneConseiller = async (db, recruteStatutWithoutDuplicates) => await Promise.all(recruteStatutWithoutDuplicates.map(
  async conseillerIdsByEmail => ({
    misesEnRelations: await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseillerIdsByEmail.conseillers[0].id, conseillerIdsByEmail.conseillers[0].structureId),
    conseiller: conseillerIdsByEmail.conseillers[0]
  })
));

const getConseillersWithMatchingMiseEnRelationsOnStructureIdMultipleConseillers = async (db, recruteStatutWithDuplicates) => await Promise.all(recruteStatutWithDuplicates.map(
  async conseillerIdsByEmail => {
    const structureId = conseillerIdsByEmail.conseillers.find(isRecrute).structureId;

    return await Promise.all(conseillerIdsByEmail.conseillers.map(
      async (conseiller) => ({
        misesEnRelations: await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseiller.id, structureId),
        conseiller
      })
    ))
  }
));

const getConseillersWithMatchingMiseEnRelationsExceptStructureId = async (db, recruteStatutWithoutDuplicates) => await Promise.all(recruteStatutWithoutDuplicates.map(
  async conseillerIdsByEmail => {
    const conseiller = conseillerIdsByEmail.conseillers.find(isRecrute);

    return {
      misesEnRelations: await getMisesEnRelationsMatchingConseillerIdExceptStructureId(db, conseiller.id, conseiller.structureId),
      conseiller
    }
  }
));

execute(__filename, async ({ db, logger, exit }) => {
  const conseillersIdsByEmail = await getConseillersIdsByEmail(db);

  const {
    noRecruteStatut,
    manyRecruteStatut,
    recruteStatutWithoutDuplicates,
    recruteStatutWithDuplicates,
  } = splitOnRecruteStatut(conseillersIdsByEmail);

  const usersAssociatedWithConseillersInspectionResult = inspectUsersAssociatedWithConseillers(await getConseillersWithMatchingUsers(db, recruteStatutWithoutDuplicates));

  const conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(
    await getConseillersWithMatchingMiseEnRelationsOnStructureIdOneConseiller(db, recruteStatutWithoutDuplicates));

  const conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(
    await getConseillersWithMatchingMiseEnRelationsExceptStructureId(db, recruteStatutWithoutDuplicates));

  const conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(
    await getConseillersWithMatchingMiseEnRelationsOnStructureIdMultipleConseillers(db, recruteStatutWithDuplicates));

  const conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(
    await getConseillersWithMatchingMiseEnRelationsExceptStructureId(db, recruteStatutWithDuplicates));

  printReport(
    logger,
    conseillersIdsByEmail,
    {
      noRecruteStatut,
      manyRecruteStatut,
      recruteStatutWithoutDuplicates,
      recruteStatutWithDuplicates,
    },
    usersAssociatedWithConseillersInspectionResult,
    conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
    conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult
  );

  exit();
});

const printReport = (
  logger,
  conseillersIdsByEmail,
  conseillersSplitOnRecruteStatut,
  usersAssociatedWithConseillersInspectionResult,
  conseillersWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
  conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult) => {
  const {
    noRecruteStatut,
    manyRecruteStatut,
    recruteStatutWithoutDuplicates,
    recruteStatutWithDuplicates,
  } = conseillersSplitOnRecruteStatut;

  console.log('Données sur le nombre de conseillers (extrait de la base de prod le 29/09)');
  console.log('');
  console.log('- Nombre total de conseillers :', conseillersIdsByEmail.length);
  console.log('- Nombre de conseillers qui n\'ont pas le statut RECRUTE :', noRecruteStatut.length);
  console.log('- Nombre de conseillers qui ont le statut RECRUTE sans doublons :', recruteStatutWithoutDuplicates.length);
  console.log('- Nombre de conseillers qui ont le statut RECRUTE avec des doublons :', recruteStatutWithDuplicates.length);
  console.log('- Nombre de conseillers qui ont le statut RECRUTE sur plusieurs de leurs doublons :', manyRecruteStatut.length);
  console.log('');

  const {
    conseillersWithoutAssociatedUser,
    conseillersAssociatedToMoreThanOneUser,
    usersWithFullNameToFix,
    usersWithoutConseillerNumeriqueEmail,
    usersAssociatedWithAConseillerWithoutConseillerRole
  } = usersAssociatedWithConseillersInspectionResult;

  console.log('Données sur les utilisateurs en lien avec des conseillers qui ont le statut RECRUTE **sans doublons**');
  console.log('');
  console.log('- Nombre de conseillers qui ne sont pas associés à un utilisateur :', conseillersWithoutAssociatedUser.length);
  console.log('- Nombre de conseillers qui sont associés à plusieurs utilisateurs :', conseillersAssociatedToMoreThanOneUser.length);
  console.log('- Nombre d\'utilisateurs dont le prénom nom ne correspond pas au prénom nom du conseiller associé :', usersWithFullNameToFix.length);
  console.log('- Nombre d\'utilisateurs qui sont associés à un conseiller, mais qui n\'ont pas de mail @conseiller-numerique.fr :', usersWithoutConseillerNumeriqueEmail.length);
  console.log('- Nombre d\'utilisateurs qui sont associés à un conseiller mais qui n\'ont pas le rôle conseiller :', usersAssociatedWithAConseillerWithoutConseillerRole.length);
  console.log('');

  const {
    conseillersWithoutAssociatedMiseEnRelation,
    conseillersAssociatedToMoreThanOneMiseEnRelation,
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus
  } = conseillersWithMatchingMiseEnRelationsOnStructureIdInspectionResult;

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus: misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates
  } = conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates;

  console.log('Données sur les mises en relation en lien avec des conseillers qui ont le statut RECRUTE **sans doublons**');
  console.log('');
  console.log('- Nombre de conseillers qui ne sont pas associés à une mise en relation :', conseillersWithoutAssociatedMiseEnRelation.length);
  console.log('- Nombre de conseillers qui sont associés à plusieurs mises en relations :', conseillersAssociatedToMoreThanOneMiseEnRelation.length);
  console.log('- Nombre de mises en relations qui n\'ont pas le statut finalisee :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus.length);
  console.log('- Nombre de mises en relations qui n\'ont pas le statut finalisee_non_disponible :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates.length);
  console.log('');

  const {
    conseillersWithMultipleMisesEnRelations,
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee,
    conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee,
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    conseillersWithoutStatutFinaliseeOrStatutRecrutee
  } = conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult;

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus: misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithDuplicates
  } = conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates;

  console.log('Données sur les mises en relation en lien avec des conseillers qui ont le statut RECRUTE **avec doublons**');
  console.log('');
  console.log('- Nombre de conseillers associés plusieurs fois à la même mise en relation :', conseillersWithMultipleMisesEnRelations.length);
  console.log('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a également le statut finalisee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee.length);
  console.log('- Nombre de conseillers associés à une mise en relation qui a le statut recrutee avec un doublon associé à une mise en relation qui a également le statut recrutee', conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee.length);
  console.log('- Nombre de conseillers associés à une mise en relation qui a le un statut finalisee avec un doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  console.log('- Nombre de conseillers associés à une mise en relation qui a le un statut finalisee et aucun doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  console.log('- Nombre de conseillers associés à une mise en relation qui a le un statut recrutee et aucun doublon associé à une mise en relation qui a le statut finalisee :', conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  console.log('- Nombre de conseillers et doublons associés a des mises en relations qui n\'ont ni le statut finalisee ni le statut recrutee :', conseillersWithoutStatutFinaliseeOrStatutRecrutee.length);
  console.log('- Nombre de mises en relations qui n\'ont pas le statut finalisee_non_disponible :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithDuplicates.length);
  console.log('');
}
