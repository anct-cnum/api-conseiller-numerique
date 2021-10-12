#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const {
  MisesEnRelationStatut,
  ConseillerStatut,
  UserRole,
  toSimpleMiseEnRelation,
  isRecrute,
  splitOnRecruteStatut,
  inspectUsersAssociatedWithConseillersWithoutDuplicates,
  inspectUsersAssociatedWithConseillersWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
  inspectConseillersRecruteProperties,
  inspectConseillersAndDuplicatesProperties,
  resetConseiller,
  extractConseillerRecruteProperties
} = require("./fixRelationshipsBetweenConseillersAndUsers.utils");
const {ObjectId} = require("mongodb");
const {program} = require("commander");

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


const getUsersMatchingConseillerId = async (db, conseillersId) => await db.collection('users')
  .find({'entity.$id': ObjectId(conseillersId)})
  .toArray();

const getConseillerWithMatchingUser = async (db, conseiller) => ({
  users: await getUsersMatchingConseillerId(db, conseiller.id),
  conseiller
});

const getConseillersWithMatchingUsersWithoutDuplicates = async (db, conseillersIdsByEmail) =>
  await Promise.all(conseillersIdsByEmail.map(async (conseillerIdsByEmail) =>
    await getConseillerWithMatchingUser(db, conseillerIdsByEmail.conseillers[0])
  ));

const getConseillersWithMatchingUsersWithDuplicates = async (db, conseillersWithMisesEnRelationsGroups) =>
  await Promise.all(conseillersWithMisesEnRelationsGroups.map(async conseillersWithMisesEnRelationsGroup =>
    await Promise.all(conseillersWithMisesEnRelationsGroup.map(async conseillersWithMisesEnRelations =>
      await getConseillerWithMatchingUser(db, conseillersWithMisesEnRelations.conseiller)
    ))
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

program.option('-f, --fix', 'automatically fix detected inconsistencies when it is possible');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {
  const conseillersIdsByEmail = await getConseillersIdsByEmail(db);

  const {
    noRecruteStatut,
    manyRecruteStatut,
    recruteStatutWithoutDuplicates,
    recruteStatutWithDuplicates,
  } = splitOnRecruteStatut(conseillersIdsByEmail);

  const usersAssociatedWithConseillersWithoutDuplicatesInspectionResult = inspectUsersAssociatedWithConseillersWithoutDuplicates(await getConseillersWithMatchingUsersWithoutDuplicates(db, recruteStatutWithoutDuplicates));

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

  const usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecruteeInspectionResult = inspectUsersAssociatedWithConseillersWithDuplicates(
    await getConseillersWithMatchingUsersWithDuplicates(db, conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee));

  const usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecruteeInspectionResult = inspectUsersAssociatedWithConseillersWithDuplicates(
    await getConseillersWithMatchingUsersWithDuplicates(db, conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee));

  const usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult = inspectUsersAssociatedWithConseillersWithDuplicates(
    await getConseillersWithMatchingUsersWithDuplicates(db, conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee));

  const conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(
    await getConseillersWithMatchingMiseEnRelationsExceptStructureId(db, recruteStatutWithDuplicates));

  const conseillersRecruteWithDuplicatesPropertiesInspectionResult = inspectConseillersRecruteProperties(recruteStatutWithDuplicates);

  program.fix && await fix(
    db,
    usersAssociatedWithConseillersWithoutDuplicatesInspectionResult,
    conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
    conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
    conseillersRecruteWithDuplicatesPropertiesInspectionResult,
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee);

  printReport(
    conseillersIdsByEmail,
    {
      noRecruteStatut,
      manyRecruteStatut,
      recruteStatutWithoutDuplicates,
      recruteStatutWithDuplicates,
    },
    usersAssociatedWithConseillersWithoutDuplicatesInspectionResult,
    conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
    conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
    conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
    conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
    conseillersRecruteWithDuplicatesPropertiesInspectionResult,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
    usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecruteeInspectionResult,
    usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecruteeInspectionResult,
    usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult
  );

  exit();
});

const logIfAny = (message, quantity) => quantity > 0 && console.log(message, quantity);

const getConseillerById = async (db, id) => await db.collection('conseillers').findOne({_id: new ObjectId(id)});

const setMiseEnRelationToRecrute = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: {statut: MisesEnRelationStatut.Recrutee}
});

const setAllMisesEnRelationsToNouvelle = async (db, conseillerId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId)
}, {
  $set: {statut: MisesEnRelationStatut.Nouvelle}
});

const setAllMisesEnRelationsToFinaliseeNonDisponible = async (db, conseillerId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId)
}, {
  $set: {statut: MisesEnRelationStatut.FinaliseeNonDisponible}
});

const setMiseEnRelationToFinaliseeNonDisponible = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: {statut: MisesEnRelationStatut.FinaliseeNonDisponible}
});

const setMiseEnRelationToFinalisee = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: {statut: MisesEnRelationStatut.Finalisee}
});

const updateConseillerInMisesEnRelations = async (db, conseillerId) => {
  db.collection('misesEnRelation').updateMany({
    'conseiller.$id': new ObjectId(conseillerId)
  }, {
    $set: {conseillerObj: await getConseillerById(db, conseillerId)}
  });
}

const replaceConseiller = async (db, conseillerId, conseillerObj) => await db.collection('conseillers').replaceOne({
  _id: new ObjectId(conseillerId)
}, conseillerObj);

const fixConseillersWithoutAssociatedUser = async (db, conseillersWithoutAssociatedUser) =>
  await Promise.all(conseillersWithoutAssociatedUser.map(async conseiller => {
    const conseillerObj = resetConseiller(await getConseillerById(db, conseiller.id));
    await setMiseEnRelationToRecrute(db, conseiller.id, conseiller.structureId, conseillerObj);
    await setAllMisesEnRelationsToNouvelle(db, conseiller.id);
    await replaceConseiller(db, conseiller.id, conseillerObj);
    await updateConseillerInMisesEnRelations(db, conseiller.id);
  }));

const setRolesToConseillerOnly = async (db, user) => await db.collection('users').updateOne({_id: user._id}, {
  $set: {
    roles: [UserRole.Conseiller]
  }
});

const fixUsersAssociatedWithAConseillerWithoutConseillerRole = async (db, usersAssociatedWithAConseillerWithoutConseillerRole) =>
  await Promise.all(usersAssociatedWithAConseillerWithoutConseillerRole.map(async user => await setRolesToConseillerOnly(db, user)));

const setUserFullName = async (db, userId, prenom, nom) =>
  await db.collection('users').updateOne({_id: new ObjectId(userId)}, {
    $set: {prenom, nom}
  });

const linkUserToConseiller = async (db, userId, conseillerId) =>
  await db.collection('users').updateOne({_id: new ObjectId(userId)}, {
    $set: {'entity.$id': new ObjectId(conseillerId)}
  });

const fixUsersFullNameWithConseillerFullName = async (db, usersWithFullNameToFix) =>
  await Promise.all(usersWithFullNameToFix.map(async ({user, conseiller}) =>
    await setUserFullName(db, user._id, conseiller.prenom, conseiller.nom)
  ));

const setConseillerDisponibleToFalse = async (db, conseillerId) =>
  await db.collection('conseillers').updateOne({_id: new ObjectId(conseillerId)}, {
    $set: {disponible: false}
  });

const fixConseillersWithInvalidDisponible = async (db, conseillers) =>
  await Promise.all(conseillers.map(async conseiller => {
    await setConseillerDisponibleToFalse(db, conseiller.id);
    await updateConseillerInMisesEnRelations(db, conseiller.id);
  }));


const setConseillerUserCreatedToTrue = async (db, conseillerId) =>
  await db.collection('conseillers').updateOne({_id: new ObjectId(conseillerId)}, {
    $set: {userCreated: true}
  });

const fixConseillersWithInvalidUserCreated = async (db, conseillers) =>
  await Promise.all(conseillers
    .filter(async conseiller => (await getUsersMatchingConseillerId(db, conseiller.id)).length > 0)
    .map(async conseiller => {
      await setConseillerUserCreatedToTrue(db, conseiller.id);
      await updateConseillerInMisesEnRelations(db, conseiller.id);
    }));

const fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus = async (db, misesEnRelations) =>
  await Promise.all(misesEnRelations.map(async miseEnRelation => {
    const conseiller = resetConseiller(await getConseillerById(db, miseEnRelation.conseiller));
    await setAllMisesEnRelationsToNouvelle(db, conseiller.id);
    await replaceConseiller(db, conseiller.id, conseiller);
    await updateConseillerInMisesEnRelations(db, conseiller.id);
  }));

const fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates = async (db, misesEnRelations) =>
  await Promise.all(misesEnRelations
    .filter(async misesEnRelation => (await getConseillerById(db, misesEnRelation.conseiller)).statut === ConseillerStatut.Recrute)
    .map(async misesEnRelation => await setMiseEnRelationToFinaliseeNonDisponible(db, misesEnRelation.conseiller, misesEnRelation.structure)));

const getUsersMatchingIds = async (db, conseillerIds) =>
  await db.collection('users').find({
    'entity.$id': {$in: conseillerIds}
  }).toArray();

const getConseillerIdsFromConseillersWithMiseEnRelationGroup = conseillerWithMiseEnRelationsGroup =>
  conseillerWithMiseEnRelationsGroup.map(({conseiller}) => ObjectId(conseiller.id));

const hasConseillerRole = user => user.roles.includes(UserRole.Conseiller);

const aggregateConseillerRecrutePropertiesFromDuplicates = conseillersDuplicates => conseillersDuplicates.reduce((result, conseiller) => ({
  ...result,
  ...extractConseillerRecruteProperties(conseiller)
}), {});

const resetAllConseillers = async (db, conseillers) =>
  await Promise.all(conseillers.map(async conseiller => {
    await replaceConseiller(db, conseiller.id, resetConseiller(await getConseillerById(db, conseiller.id)));
    await updateConseillerInMisesEnRelations(db, conseiller.id);
  }));

const rollbackBeforeImport = async (db, conseillers, conseillerRecrute) => {
  await Promise.all(conseillers.map(async conseiller => await setAllMisesEnRelationsToNouvelle(db, conseiller.id)));
  await setMiseEnRelationToRecrute(db, conseillerRecrute.id, conseillerRecrute.structureId);
  await resetAllConseillers(db, conseillers);
};

const fixMisesEnRelations = async (db, conseillerRecrute, conseillersDuplicates) => {
  await setAllMisesEnRelationsToFinaliseeNonDisponible(db, conseillerRecrute.id)
  await setMiseEnRelationToFinalisee(db, conseillerRecrute.id, conseillerRecrute.structureId);
  await Promise.all(conseillersDuplicates.map(async conseillerDuplicate => await setAllMisesEnRelationsToFinaliseeNonDisponible(db, conseillerDuplicate.id)));
};

const fixConseillerRecruteAndDuplicates = async (db, conseillerRecrute, conseillersDuplicates, conseillerRecruteProperties) => {
  await replaceConseiller(db, conseillerRecrute.id, {...await getConseillerById(db, conseillerRecrute.id), ...conseillerRecruteProperties});
  await updateConseillerInMisesEnRelations(db, conseillerRecrute.id);
  await resetAllConseillers(db, conseillersDuplicates);
};

const fixUser = async (db, conseillerUser, conseillerRecrute) => {
  await setUserFullName(db, conseillerUser._id, conseillerRecrute.prenom, conseillerRecrute.nom);
  await linkUserToConseiller(db, conseillerUser._id, conseillerRecrute.id);
};

const fixConseillersRecrutesUsersAndMiseEnRelations = async (db, conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee) =>
  await Promise.all(conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.map(async conseillerWithMiseEnRelationsGroup => {
    const users = await getUsersMatchingIds(db, getConseillerIdsFromConseillersWithMiseEnRelationGroup(conseillerWithMiseEnRelationsGroup));
    const conseillerUser = users.find(hasConseillerRole);
    const conseillerRecrute = conseillerWithMiseEnRelationsGroup.find(({conseiller}) => isRecrute(conseiller)).conseiller;
    const conseillersDuplicates = conseillerWithMiseEnRelationsGroup.filter(({conseiller}) => !isRecrute(conseiller)).map(({conseiller}) => conseiller);
    const conseillerRecruteProperties = aggregateConseillerRecrutePropertiesFromDuplicates(conseillersDuplicates);

    if (conseillerUser == null) {
      await rollbackBeforeImport(db, [conseillerRecrute, ...conseillersDuplicates], conseillerRecrute);
      return;
    }

    await fixMisesEnRelations(db, conseillerRecrute, conseillersDuplicates);
    await fixConseillerRecruteAndDuplicates(db, conseillerRecrute, conseillersDuplicates, conseillerRecruteProperties);
    await fixUser(db, conseillerUser, conseillerRecrute);
  }));

const fix = async (
  db,
  usersAssociatedWithConseillersWithoutDuplicatesInspectionResult,
  conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
  conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
  conseillersRecruteWithDuplicatesPropertiesInspectionResult,
  conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
  conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
  conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee) => {
  const {
    conseillersWithoutAssociatedUser,
    usersWithFullNameToFix,
    usersAssociatedWithAConseillerWithoutConseillerRole
  } = usersAssociatedWithConseillersWithoutDuplicatesInspectionResult;
  await fixConseillersWithoutAssociatedUser(db, conseillersWithoutAssociatedUser);
  await fixUsersAssociatedWithAConseillerWithoutConseillerRole(db, usersAssociatedWithAConseillerWithoutConseillerRole);
  await fixUsersFullNameWithConseillerFullName(db, usersWithFullNameToFix);

  const {
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithoutDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithoutDuplicates
  } = conseillersRecruteWithoutDuplicatesPropertiesInspectionResult;
  await fixConseillersWithInvalidDisponible(db, conseillersWithInvalidDisponibleWithoutDuplicates);
  await fixConseillersWithInvalidUserCreated(db, conseillersWithInvalidUserCreatedWithoutDuplicates);

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus
  } = conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult;
  await fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus(db, misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus);

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus: misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates
  } = conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates;
  await fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates(db,  misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates);

  const {
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithDuplicates
  } = conseillersRecruteWithDuplicatesPropertiesInspectionResult;
  await fixConseillersWithInvalidDisponible(db, conseillersWithInvalidDisponibleWithDuplicates);
  await fixConseillersWithInvalidUserCreated(db, conseillersWithInvalidUserCreatedWithDuplicates);

  await fixConseillersRecrutesUsersAndMiseEnRelations(db,  conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee);
  await fixConseillersRecrutesUsersAndMiseEnRelations(db,  conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee);
  await fixConseillersRecrutesUsersAndMiseEnRelations(db,  conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee);
}

const printReport = (
  conseillersIdsByEmail,
  conseillersSplitOnRecruteStatut,
  usersAssociatedWithConseillersWithoutDuplicatesInspectionResult,
  conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
  conseillersWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
  conseillersWithDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
  conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithDuplicates,
  conseillersRecruteWithDuplicatesPropertiesInspectionResult,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
  conseillersAndDuplicatesPropertiesInspectionResultForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee,
  usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecruteeInspectionResult,
  usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecruteeInspectionResult,
  usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult
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
  } = usersAssociatedWithConseillersWithoutDuplicatesInspectionResult;

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

  const {
    conseillersRecrutesAssociatedToMoreThanOneUser: conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersRecrutesWithAConseillerUser: conseillersRecrutesWithAConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    conseillersDuplicatesWithAConseillerUser: conseillersDuplicatesWithAConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
    noConseillerUser: noConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee
  } = usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecruteeInspectionResult;

  const {
    conseillersRecrutesAssociatedToMoreThanOneUser: conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersRecrutesWithAConseillerUser: conseillersRecrutesWithAConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    conseillersDuplicatesWithAConseillerUser: conseillersDuplicatesWithAConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
    noConseillerUser: noConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee
  } = usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecruteeInspectionResult;

  const {
    conseillersRecrutesAssociatedToMoreThanOneUser: conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult,
    conseillersRecrutesWithAConseillerUser: conseillersRecrutesWithAConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult,
    conseillersDuplicatesWithAConseillerUser: conseillersDuplicatesWithAConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult,
    noConseillerUser: noConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult
  } = usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult;

  console.log('Données sur les mises en relation en lien avec des conseillers qui ont le statut RECRUTE **avec doublons**');
  console.log('');
  logIfAny('- Nombre de conseillers associés plusieurs fois à la même mise en relation :', conseillersWithMultipleMisesEnRelations.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a également le statut finalisee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut recrutee avec un doublon associé à une mise en relation qui a également le statut recrutee', conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee avec un doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller recruté est associé avec plusieurs utilisateurs qui ont le rôle conseiller :', conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller recruté est associé avec un utilisateur qui a le rôle conseiller :', conseillersRecrutesWithAConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller doublon est associé avec au moins un utilisateur qui a le rôle conseiller :', conseillersDuplicatesWithAConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('  - dont aucun conseiller recruté ou doublon n\'est associé avec un utilisateur qui a le rôle conseiller :', noConseillerUserForConseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut finalisee et aucun doublon associé à une mise en relation qui a le statut recrutee :', conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller recruté est associé avec plusieurs utilisateurs qui ont le rôle conseiller :', conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller recruté est associé avec un utilisateur qui a le rôle conseiller :', conseillersRecrutesWithAConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('  - dont un conseiller doublon est associé avec au moins un utilisateur qui a le rôle conseiller :', conseillersDuplicatesWithAConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('  - dont aucun conseiller recruté ou doublon n\'est associé avec un utilisateur qui a le rôle conseiller :', noConseillerUserForConseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.length);
  logIfAny('- Nombre de conseillers associés à une mise en relation qui a le statut recrutee et aucun doublon associé à une mise en relation qui a le statut finalisee :', conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.length);
  logIfAny('  - dont un conseiller recruté est associé avec plusieurs utilisateurs qui ont le rôle conseiller :', conseillersRecrutesAssociatedToMoreThanOneUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult.length);
  logIfAny('  - dont un conseiller recruté est associé avec un utilisateur qui a le rôle conseiller :', conseillersRecrutesWithAConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult.length);
  logIfAny('  - dont un conseiller doublon est associé avec au moins un utilisateur qui a le rôle conseiller :', conseillersDuplicatesWithAConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult.length);
  logIfAny('  - dont aucun conseiller recruté ou doublon n\'est associé avec un utilisateur qui a le rôle conseiller :', noConseillerUserForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult.length);
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
