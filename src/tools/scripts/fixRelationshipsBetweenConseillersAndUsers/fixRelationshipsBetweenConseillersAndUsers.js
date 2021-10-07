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
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
  inspectConseillersRecruteProperties,
  inspectConseillersAndDuplicatesProperties
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

  const conseillersRecruteWithoutDuplicatesPropertiesInspectionResult = inspectConseillersRecruteProperties(recruteStatutWithoutDuplicates);

  const conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(
    await getConseillersWithMatchingMiseEnRelationsOnStructureIdMultipleConseillers(db, recruteStatutWithDuplicates));

  const {
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
  } = conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult;

  const conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee = inspectConseillersAndDuplicatesProperties(conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee);
  const conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee = inspectConseillersAndDuplicatesProperties(conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee);
  const conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee = inspectConseillersAndDuplicatesProperties(conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee);

  const conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(
    await getConseillersWithMatchingMiseEnRelationsExceptStructureId(db, recruteStatutWithDuplicates));

  const conseillersRecruteWithDuplicatesPropertiesInspectionResult = inspectConseillersRecruteProperties(recruteStatutWithDuplicates);

  printReport(
    conseillersIdsByEmail,
    {
      noRecruteStatut,
      manyRecruteStatut,
      recruteStatutWithoutDuplicates,
      recruteStatutWithDuplicates,
    },
    usersAssociatedWithConseillersInspectionResult,
    conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
    conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
    conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
    conseillersRecruteWithDuplicatesPropertiesInspectionResult,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee
  );

  exit();
});

const logIfAny = (message, quantity) => quantity > 0 && console.log(message, quantity);

const printReport = (
  conseillersIdsByEmail,
  conseillersSplitOnRecruteStatut,
  usersAssociatedWithConseillersInspectionResult,
  conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
  conseillersWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
  conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
  conseillersRecruteWithDuplicatesPropertiesInspectionResult,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee
  ) => {
  const {
    noRecruteStatut,
    manyRecruteStatut,
    recruteStatutWithoutDuplicates,
    recruteStatutWithDuplicates,
  } = conseillersSplitOnRecruteStatut;

  console.log('Données sur le nombre de conseillers (extrait de la base de prod le 29/09)');
  console.log('');
  logIfAny('- Nombre total de conseillers :', conseillersIdsByEmail.length);
  logIfAny('- Nombre de conseillers qui n\'ont pas le statut RECRUTE :', noRecruteStatut.length);
  logIfAny('- Nombre de conseillers qui ont le statut RECRUTE sans doublons :', recruteStatutWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers qui ont le statut RECRUTE avec des doublons :', recruteStatutWithDuplicates.length);
  logIfAny('- Nombre de conseillers qui ont le statut RECRUTE sur plusieurs de leurs doublons :', manyRecruteStatut.length);
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
  logIfAny('- Nombre de conseillers qui ne sont pas associés à une mise en relation :', conseillersWithoutAssociatedMiseEnRelation.length);
  logIfAny('- Nombre de conseillers qui sont associés à plusieurs mises en relations :', conseillersAssociatedToMoreThanOneMiseEnRelation.length);
  logIfAny('- Nombre de mises en relations qui n\'ont pas le statut finalisee :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus.length);
  logIfAny('- Nombre de mises en relations qui n\'ont pas le statut finalisee_non_disponible :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates.length);
  console.log('');

  const {
    conseillersWithInvalidDateFinFormation: conseillersWithInvalidDateFinFormationWithoutDuplicates,
    conseillersWithInvalidDatePrisePoste: conseillersWithInvalidDatePrisePosteWithoutDuplicates,
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithoutDuplicates,
    conseillersWithInvalidStructureId: conseillersWithInvalidStructureIdWithoutDuplicates,
    conseillersWithInvalidEstRecrute: conseillersWithInvalidEstRecruteWithoutDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithoutDuplicates,
    conseillersWithMattermostError: conseillersWithMattermostErrorWithoutDuplicates,
    conseillersWithEmailCNError: conseillersWithEmailCNErrorWithoutDuplicates
  } = conseillersRecruteWithoutDuplicatesPropertiesInspectionResult;

  console.log('Données sur les conseillers qui ont le statut RECRUTE **sans doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de date de fin de formation :', conseillersWithInvalidDateFinFormationWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de date de prise de poste :', conseillersWithInvalidDatePrisePosteWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas UserCreated à true :', conseillersWithInvalidUserCreatedWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de structure id :', conseillersWithInvalidStructureIdWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de estRecrute à true :', conseillersWithInvalidEstRecruteWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de disponible à false :', conseillersWithInvalidDisponibleWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui ont un compte mattermost en erreur :', conseillersWithMattermostErrorWithoutDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui ont un email CN en erreur :', conseillersWithEmailCNErrorWithoutDuplicates.length);
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
  logIfAny('- Nombre de conseillers qui ne sont pas associés à un utilisateur :', conseillersWithoutAssociatedUser.length);
  logIfAny('- Nombre de conseillers qui sont associés à plusieurs utilisateurs :', conseillersAssociatedToMoreThanOneUser.length);
  logIfAny('- Nombre d\'utilisateurs dont le prénom nom ne correspond pas au prénom nom du conseiller associé :', usersWithFullNameToFix.length);
  logIfAny('- Nombre d\'utilisateurs qui sont associés à un conseiller, mais qui n\'ont pas de mail @conseiller-numerique.fr :', usersWithoutConseillerNumeriqueEmail.length);
  logIfAny('- Nombre d\'utilisateurs qui sont associés à un conseiller mais qui n\'ont pas le rôle conseiller :', usersAssociatedWithAConseillerWithoutConseillerRole.length);
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
  logIfAny('- Nombre de conseillers associés plusieurs fois à la même mise en relation :', conseillersWithMultipleMisesEnRelations.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a également le statut finalisee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut recrutee avec un doublon associé à une mise en relation qui a également le statut recrutee', conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee et aucun doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut recrutee et aucun doublon associé à une mise en relation qui a le statut finalisee :', conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers et doublons associés a des mises en relations qui n\'ont ni le statut finalisee ni le statut recrutee :', conseillersWithoutStatutFinaliseeOrStatutRecrutee.length);
  logIfAny('- Nombre de mises en relations qui n\'ont pas le statut finalisee_non_disponible :', misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithDuplicates.length);
  console.log('');

  const {
    conseillersWithInvalidDateFinFormation: conseillersWithInvalidDateFinFormationWithDuplicates,
    conseillersWithInvalidDatePrisePoste: conseillersWithInvalidDatePrisePosteWithDuplicates,
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithDuplicates,
    conseillersWithInvalidStructureId: conseillersWithInvalidStructureIdWithDuplicates,
    conseillersWithInvalidEstRecrute: conseillersWithInvalidEstRecruteWithDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithDuplicates,
    conseillersWithMattermostError: conseillersWithMattermostErrorWithDuplicates,
    conseillersWithEmailCNError: conseillersWithEmailCNErrorWithDuplicates
  } = conseillersRecruteWithDuplicatesPropertiesInspectionResult;

  console.log('Données sur les conseillers qui ont le statut RECRUTE **avec doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de date de fin de formation :', conseillersWithInvalidDateFinFormationWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de date de prise de poste :', conseillersWithInvalidDatePrisePosteWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas UserCreated à true :', conseillersWithInvalidUserCreatedWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de structure id :', conseillersWithInvalidStructureIdWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de estRecrute à true :', conseillersWithInvalidEstRecruteWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui n\'ont pas de disponible à false :', conseillersWithInvalidDisponibleWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui ont un compte mattermost en erreur :', conseillersWithMattermostErrorWithDuplicates.length);
  logIfAny('- Nombre de conseillers recrutés qui ont un email CN en erreur :', conseillersWithEmailCNErrorWithDuplicates.length);
  console.log('');


  const {
    invalidRecruteAllValidDuplicates: invalidRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    invalidRecruteOneInvalidDuplicates: invalidRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    invalidRecruteManyInvalidDuplicates: invalidRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    validRecruteAllValidDuplicates: validRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    validRecruteOneInvalidDuplicates: validRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    validRecruteManyInvalidDuplicates: validRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee
  } = conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee;

  console.log('Données sur les conseillers qui ont le statut RECRUTE associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a le statut recrutee **avec doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers recrutés invalides avec tous les doublons valides', invalidRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec un doublon invalide', invalidRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec plusieurs doublons invalides', invalidRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec tous les doublons valides', validRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec un doublon invalide', validRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec plusieurs doublons invalides', validRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  console.log('');

  const {
    invalidRecruteAllValidDuplicates: invalidRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    invalidRecruteOneInvalidDuplicates: invalidRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    invalidRecruteManyInvalidDuplicates: invalidRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    validRecruteAllValidDuplicates: validRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    validRecruteOneInvalidDuplicates: validRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    validRecruteManyInvalidDuplicates: validRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee
  } = conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee;

  console.log('Données sur les conseillers qui ont le statut RECRUTE associés à une mise en relation qui a le statut finalisee et aucun doublon associé à une mise en relation qui a le statut recrutee **avec doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers recrutés invalides avec tous les doublons valides', invalidRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec un doublon invalide', invalidRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec plusieurs doublons invalides', invalidRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec tous les doublons valides', validRecruteAllValidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec un doublon invalide', validRecruteOneInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec plusieurs doublons invalides', validRecruteManyInvalidDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  console.log('');

  const {
    invalidRecruteAllValidDuplicates: invalidRecruteAllValidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    invalidRecruteOneInvalidDuplicates: invalidRecruteOneInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    invalidRecruteManyInvalidDuplicates: invalidRecruteManyInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    validRecruteAllValidDuplicates: validRecruteAllValidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    validRecruteOneInvalidDuplicates: validRecruteOneInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    validRecruteManyInvalidDuplicates: validRecruteManyInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee
  } = conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee;

  console.log('Données sur les conseillers qui ont le statut RECRUTE associés à une mise en relation qui a le statut recrutee et aucun doublon associé à une mise en relation qui a le statut finalisee **avec doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers recrutés invalides avec tous les doublons valides', invalidRecruteAllValidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec un doublon invalide', invalidRecruteOneInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers recrutés invalides avec plusieurs doublons invalides', invalidRecruteManyInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec tous les doublons valides', validRecruteAllValidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec un doublon invalide', validRecruteOneInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers recrutés valides avec plusieurs doublons invalides', validRecruteManyInvalidDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  console.log('');
}
