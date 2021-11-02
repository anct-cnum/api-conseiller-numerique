#!/usr/bin/env node
'use strict';

/* eslint-disable max-len */

const { execute } = require('../../utils');
const { Pool } = require('pg');
const {
  MisesEnRelationStatut,
  UserRole,
  toSimpleMiseEnRelation,
  isRecrute,
  hasStatutRecrutee,
  splitOnRecruteStatut,
  hasConseillerRole,
  inspectUsersAssociatedWithConseillersWithoutDuplicates,
  inspectUsersAssociatedWithConseillersWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
  inspectConseillersRecruteProperties,
  inspectConseillersAndDuplicatesProperties,
  resetConseiller,
  aggregateConseillerRecrutePropertiesFromDuplicates,
  getConseillerIdsFromConseillersWithMiseEnRelationGroup
} = require('./fixRelationshipsBetweenConseillersAndUsers.utils');
const { ObjectId } = require('mongodb');
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const departements = require('../../../../data/imports/departements-region.json');
const cli = require('commander');

const getConseillersByEmail = async db => await db.collection('conseillers').aggregate(
  [
    {
      $group: {
        _id: '$email',
        conseillers: {
          $push: {
            _id: '$_id',
            prenom: '$prenom',
            nom: '$nom',
            email: '$email',
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
  'structure.$id': { $ne: new ObjectId(structureId) }
})
.map(toSimpleMiseEnRelation)
.toArray();

const getUsersMatchingConseillerId = async (db, conseillersId) => await db.collection('users')
.find({ 'entity.$id': new ObjectId(conseillersId) })
.toArray();

const getConseillerWithMatchingUser = async (db, conseiller) => ({
  users: await getUsersMatchingConseillerId(db, conseiller._id),
  conseiller
});

const getConseillersWithMatchingUsersWithoutDuplicates = async (db, conseillersByEmail) =>
  await Promise.all(conseillersByEmail.map(async ({ conseillers }) =>
    await getConseillerWithMatchingUser(db, conseillers[0])
  ));

const getConseillersWithMatchingUsersWithDuplicates = async (db, conseillersWithMisesEnRelationsGroups) =>
  await Promise.all(conseillersWithMisesEnRelationsGroups.map(async conseillersWithMisesEnRelationsGroup =>
    await Promise.all(conseillersWithMisesEnRelationsGroup.map(async conseillersWithMisesEnRelations =>
      await getConseillerWithMatchingUser(db, conseillersWithMisesEnRelations.conseiller)
    ))
  ));

const getConseillersWithMatchingMiseEnRelationsOnStructureIdOneConseiller = async (db, recruteStatutWithoutDuplicates) => await Promise.all(recruteStatutWithoutDuplicates.map(
  async ({ conseillers }) => ({
    misesEnRelations: await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseillers[0]._id, conseillers[0].structureId),
    conseiller: conseillers[0]
  })
));

const getConseillersWithMatchingMiseEnRelationsOnStructureIdMultipleConseillers = async (db, recruteStatutWithDuplicates) => await Promise.all(recruteStatutWithDuplicates.map(
  async conseillerIdsByEmail => await Promise.all(conseillerIdsByEmail.conseillers.map(
    async conseiller => ({
      misesEnRelations: await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseiller._id, conseillerIdsByEmail.conseillers.find(isRecrute).structureId),
      conseiller
    })
  ))
));

const getConseillersWithMatchingMiseEnRelationsExceptStructureId = async (db, recruteStatutWithoutDuplicates) => await Promise.all(recruteStatutWithoutDuplicates.map(
  async conseillerIdsByEmail => {
    const conseiller = conseillerIdsByEmail.conseillers.find(isRecrute);

    return {
      misesEnRelations: await getMisesEnRelationsMatchingConseillerIdExceptStructureId(db, conseiller._id, conseiller.structureId),
      conseiller
    };
  }
));

const getConseillerById = async (db, id) => await db.collection('conseillers').findOne({ _id: new ObjectId(id) });

const setAllMisesEnRelationsToNouvelleExceptStructureId = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': { $ne: new ObjectId(structureId) },
}, {
  $set: { statut: MisesEnRelationStatut.Nouvelle }
});

const setAllMisesEnRelationsFinaliseeToNouvelleExceptStructureId = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': { $ne: new ObjectId(structureId) },
  'statut': MisesEnRelationStatut.Finalisee
}, {
  $set: { statut: MisesEnRelationStatut.Nouvelle }
});

const setAllMisesEnRelationsToFinaliseeNonDisponible = async (db, conseillerId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId)
}, {
  $set: { statut: MisesEnRelationStatut.FinaliseeNonDisponible }
});

const setMiseEnRelationToFinaliseeNonDisponible = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: { statut: MisesEnRelationStatut.FinaliseeNonDisponible }
});

const setMiseEnRelationToFinalisee = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: { statut: MisesEnRelationStatut.Finalisee }
});

const setMiseEnRelationToRecrutee = async (db, conseillerId, structureId) => await db.collection('misesEnRelation').updateOne({
  'conseiller.$id': new ObjectId(conseillerId),
  'structure.$id': new ObjectId(structureId),
}, {
  $set: { statut: MisesEnRelationStatut.Recrutee }
});

const updateConseillerInMisesEnRelations = async (db, conseillerId) => await db.collection('misesEnRelation').updateMany({
  'conseiller.$id': new ObjectId(conseillerId)
}, {
  $set: { conseillerObj: await getConseillerById(db, conseillerId) }
});

const setRolesToCandidatOnly = async (db, userId) => await db.collection('users').updateOne({ _id: userId }, {
  $set: {
    roles: [UserRole.Candidat]
  }
});

const getStructureById = async (db, structureId) => await db.collection('structures').findOne({ _id: structureId });

const pool = new Pool();

const updateConseillerPG = async conseiller => {
  try {
    await pool.query(`UPDATE djapp_coach
    SET disponible = $2
    WHERE id = $1`,
    [
      conseiller.idPG,
      conseiller.disponible
    ]);
  } catch (error) {
    console.error(error);
  }
};

const replaceConseiller = async (db, conseillerId, conseillerObj) => {
  await updateConseillerPG(conseillerObj);

  await db.collection('conseillers').replaceOne({
    _id: new ObjectId(conseillerId)
  }, conseillerObj);
};

const setConseillerDisponibleToFalse = async (db, conseillerId) => {
  await updateConseillerPG({ ...(await getConseillerById(db, conseillerId)), disponible: false });

  await db.collection('conseillers').updateOne({ _id: new ObjectId(conseillerId) }, {
    $set: { disponible: false }
  });
};

const setConseillerEstRecruteToTrue = async (db, conseillerId) => {
  await updateConseillerPG({ ...(await getConseillerById(db, conseillerId)), estRecrute: true });

  await db.collection('conseillers').updateOne({ _id: new ObjectId(conseillerId) }, {
    $set: { estRecrute: true }
  });
};

const getConseillerRecruteInfo = (conseiller, structure) => ({
  email: conseiller.email,
  prenom: conseiller.prenom,
  nom: conseiller.nom,
  dateDebutFormation: conseiller.datePrisePoste,
  dateFinFormation: conseiller.dateFinFormation,
  nomCommune: conseiller.nomCommune,
  departement: departements.find(departement => departement.num_dep.toString() === conseiller.codeDepartement.toString())?.dep_name ?? conseiller.codeDepartement,
  region: departements.find(departement => departement.num_dep.toString() === conseiller.codeDepartement.toString())?.region_name ?? conseiller.codeRegion,
  codeDepartement: conseiller.codeDepartement,
  siret: structure?.insee?.entreprise?.siret_siege_social,
  structureId: structure?.idPG,
  raisonSociale: structure?.insee?.entreprise?.raison_sociale,
  mailSa: structure?.contact?.email,
});

const rollbackBeforeImportNoDuplicates = async (db, conseillers) => await Promise.all(conseillers.map(async conseiller => {
  const conseillerObj = resetConseiller(await getConseillerById(db, conseiller._id));
  await setAllMisesEnRelationsFinaliseeToNouvelleExceptStructureId(db, conseiller._id, conseiller.structureId);
  const misesEnRelations = await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseiller._id, conseiller.structureId);
  if (misesEnRelations.length > 0 && misesEnRelations[0].statut === MisesEnRelationStatut.Finalisee) {
    await setMiseEnRelationToRecrutee(db, conseiller._id, conseiller.structureId);
  }
  const user = await getUsersMatchingConseillerId(db, conseillerObj._id);
  await replaceConseiller(db, conseiller._id, { ...conseillerObj, userCreated: user !== undefined });
  await updateConseillerInMisesEnRelations(db, conseiller._id);

  return getConseillerRecruteInfo(conseillerObj, await getStructureById(db, conseiller.structureId));
}));

const fixUsersAssociatedWithAConseillerWithoutConseillerRole = async (db, usersAssociatedWithAConseillerWithoutConseillerRole) => {
  const conseillers = await Promise.all(usersAssociatedWithAConseillerWithoutConseillerRole.map(async user => await getConseillerById(db, user.entity.oid)));

  return await rollbackBeforeImportNoDuplicates(db, conseillers);
};

const fixUsersFullNameWithConseillerFullName = async (db, usersWithFullNameToFix) =>
  await Promise.all(usersWithFullNameToFix.map(async ({ user, conseiller }) =>
    await db.collection('users').updateOne({ _id: new ObjectId(user._id) }, {
      $set: {
        prenom: conseiller.prenom,
        nom: conseiller.nom
      }
    })));

const setConseillerUserCreatedToTrue = async (db, conseillerId) =>
  await db.collection('conseillers').updateOne({ _id: new ObjectId(conseillerId) }, {
    $set: { userCreated: true }
  });

const setConseillerUserCreatedToFalse = async (db, conseillerId) =>
  await db.collection('conseillers').updateOne({ _id: new ObjectId(conseillerId) }, {
    $set: { userCreated: false }
  });

const getUsersMatchingConseillerIds = async (db, conseillerIds) =>
  await db.collection('users').find({
    'entity.$id': { $in: conseillerIds }
  }).toArray();

const fixConseillersWithInvalidUserCreated = async (db, conseillers) => {
  return await Promise.all(conseillers
  .map(async conseiller => {
    const users = await getUsersMatchingConseillerId(db, conseiller._id);

    if (users.length === 0) {
      await setConseillerUserCreatedToFalse(db, conseiller._id);
    } else {
      await setConseillerUserCreatedToTrue(db, conseiller._id);
    }

    await updateConseillerInMisesEnRelations(db, conseiller._id);
  }));
};

const fixConseillersWithInvalidDisponible = async (db, conseillers) =>
  await Promise.all(conseillers.map(async conseiller => {
    if (!isRecrute(await getConseillerById(db, conseiller._id))) {
      return;
    }

    await setConseillerDisponibleToFalse(db, conseiller._id);
    await updateConseillerInMisesEnRelations(db, conseiller._id);
  }));

const fixConseillersWithInvalidEstRecrute = async (db, conseillers) =>
  await Promise.all(conseillers.map(async conseiller => {
    if (!isRecrute(await getConseillerById(db, conseiller._id))) {
      return;
    }
    await setConseillerEstRecruteToTrue(db, conseiller._id);
    await updateConseillerInMisesEnRelations(db, conseiller._id);
  }));

const fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatusWithoutDuplicates = async (db, misesEnRelations) =>
  await Promise.all(misesEnRelations.map(async miseEnRelation => {
    const conseiller = await getConseillerById(db, miseEnRelation.conseiller);
    const conseillerReset = resetConseiller(conseiller);
    await setAllMisesEnRelationsToNouvelleExceptStructureId(db, conseiller._id);
    await setMiseEnRelationToRecrutee(db, conseiller._id, conseiller.structureId);
    await replaceConseiller(db, conseiller._id, conseiller);
    await updateConseillerInMisesEnRelations(db, conseiller._id);
    const users = await getUsersMatchingConseillerIds(db, [conseiller._id]);
    await Promise.all(users.map(async user => await setRolesToCandidatOnly(db, user._id)));

    return getConseillerRecruteInfo(conseillerReset, await getStructureById(db, conseiller.structureId));
  }));

const resetAllConseillers = async (db, conseillers, disponible, userCreated) =>
  await Promise.all(conseillers.map(async conseiller => {
    // eslint-disable-next-line no-unused-vars
    const conseillerReset = resetConseiller(await getConseillerById(db, conseiller._id));
    await replaceConseiller(db, conseiller._id, { ...conseillerReset, disponible, userCreated: userCreated ?? conseiller.userCreated });
    await updateConseillerInMisesEnRelations(db, conseiller._id);
  }));

const rollbackBeforeImport = async (db, conseillers, conseillerRecrute) => {
  await Promise.all(conseillers.map(async conseiller => await setAllMisesEnRelationsFinaliseeToNouvelleExceptStructureId(db, conseiller._id, conseiller.structureId)));
  await resetAllConseillers(db, conseillers, true);

  const misesEnRelations = await getMisesEnRelationsMatchingConseillerIdAndStructureId(db, conseillerRecrute._id, conseillerRecrute.structureId);
  if (misesEnRelations.length > 0 && misesEnRelations[0].statut === MisesEnRelationStatut.Finalisee) {
    await setMiseEnRelationToRecrutee(db, conseillerRecrute._id, conseillerRecrute.structureId);
  }

  return getConseillerRecruteInfo(
    await getConseillerById(db, conseillerRecrute._id),
    await getStructureById(db, conseillerRecrute.structureId));
};

const fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates = async (db, misesEnRelations) => {
  await Promise.all(misesEnRelations.map(async misesEnRelation => {
    if (!isRecrute(await getConseillerById(db, misesEnRelation.conseiller))) {
      return;
    }
    await setMiseEnRelationToFinaliseeNonDisponible(db, misesEnRelation.conseiller, misesEnRelation.structure);
  }));
};

const fixMisesEnRelations = async (db, conseillerRecruteId, conseillerRecruteStructureId, conseillersDuplicates) => {
  await setAllMisesEnRelationsToFinaliseeNonDisponible(db, conseillerRecruteId);
  await setMiseEnRelationToFinalisee(db, conseillerRecruteId, conseillerRecruteStructureId);
  await Promise.all(conseillersDuplicates.map(async conseillerDuplicate => await setAllMisesEnRelationsToFinaliseeNonDisponible(db, conseillerDuplicate._id)));
};

const fixConseillerRecruteAndDuplicates = async (db, conseillerRecrute, conseillersDuplicates, conseillerRecruteProperties) => {
  await replaceConseiller(db, conseillerRecrute._id, { ...await getConseillerById(db, conseillerRecrute._id), ...conseillerRecruteProperties });
  await updateConseillerInMisesEnRelations(db, conseillerRecrute._id);
  await resetAllConseillers(db, conseillersDuplicates, false, false);
};

const fixUser = async (db, conseillerUser, conseiller) =>
  await db.collection('users').updateOne({ _id: new ObjectId(conseillerUser._id) }, {
    $set: {
      'entity.$id': new ObjectId(conseiller._id),
      'prenom': conseiller.prenom,
      'nom': conseiller.nom
    }
  });

const getConseillerIdAndStructureId = conseillerWithMiseEnRelationsGroup => {
  const conseillerRecruteMiseEnRelation = conseillerWithMiseEnRelationsGroup
  .flatMap(({ misesEnRelations }) => misesEnRelations)
  .find(hasStatutRecrutee);

  const currentConseillerRecrute = conseillerWithMiseEnRelationsGroup.find(({ conseiller }) => isRecrute(conseiller)).conseiller;

  return {
    conseillerId: conseillerRecruteMiseEnRelation?.conseiller ?? currentConseillerRecrute._id,
    structureId: conseillerRecruteMiseEnRelation?.structure ?? currentConseillerRecrute.structureId
  };
};

const removeCandidatUsers = async (db, userIds) =>
  await db.collection('users').deleteOne({
    _id: { $in: userIds },
    roles: [UserRole.Candidat]
  });

const fixConseillersRecrutesUsersAndMiseEnRelations = async (db, conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee) =>
  await Promise.all(conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.map(async conseillerWithMiseEnRelationsGroup => {
    const users = await getUsersMatchingConseillerIds(db, getConseillerIdsFromConseillersWithMiseEnRelationGroup(conseillerWithMiseEnRelationsGroup));
    const conseillerUser = users.find(hasConseillerRole);
    const { conseillerId, structureId } = getConseillerIdAndStructureId(conseillerWithMiseEnRelationsGroup);
    const conseillerRecrute = await getConseillerById(db, conseillerId);
    const conseillersDuplicates = conseillerWithMiseEnRelationsGroup.filter(({ conseiller }) => conseiller._id.toString() !== conseillerRecrute._id.toString()).map(({ conseiller }) => conseiller);
    const conseillerRecruteProperties = {
      ...aggregateConseillerRecrutePropertiesFromDuplicates(conseillersDuplicates),
      structureId: new ObjectId(structureId),
      userCreated: true,
      estRecrute: true,
      disponible: false,
    };

    if (conseillerUser === undefined) {
      return await rollbackBeforeImport(db, [conseillerRecrute, ...conseillersDuplicates], conseillerRecrute);
    }

    if (!isRecrute(conseillerRecrute)) {
      const candidatUser = users.find(user => user.entity.oid.toString() === conseillerRecrute._id.toString());
      if (candidatUser !== undefined) {
        await fixUser(db, candidatUser, conseillersDuplicates.find(isRecrute));
      }
    }

    await fixUser(db, conseillerUser, conseillerRecrute);
    await fixConseillerRecruteAndDuplicates(db, conseillerRecrute, conseillersDuplicates, conseillerRecruteProperties);
    await fixMisesEnRelations(db, conseillerRecrute._id, structureId, conseillersDuplicates);
    await removeCandidatUsers(db, users.map(user => user._id));
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
  const conseillersWithoutAssociatedUserToReimportInfo = await rollbackBeforeImportNoDuplicates(db, conseillersWithoutAssociatedUser);

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus
  } = conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult;
  const conseillerWithoutFinaliseeStatusToReimportInfo = await fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatusWithoutDuplicates(db, misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus);

  const conseillerWithoutConseillerRole = await fixUsersAssociatedWithAConseillerWithoutConseillerRole(db, usersAssociatedWithAConseillerWithoutConseillerRole);
  await fixUsersFullNameWithConseillerFullName(db, usersWithFullNameToFix);

  const {
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithoutDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithoutDuplicates
  } = conseillersRecruteWithoutDuplicatesPropertiesInspectionResult;
  await fixConseillersWithInvalidUserCreated(db, conseillersWithInvalidUserCreatedWithoutDuplicates);
  await fixConseillersWithInvalidDisponible(db, conseillersWithInvalidDisponibleWithoutDuplicates);

  const {
    misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus: misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates
  } = conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates;
  await fixMisesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates(db, misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatusWithoutDuplicates);

  const conseillersWithDuplicatesToReimport = [
    ...await fixConseillersRecrutesUsersAndMiseEnRelations(db, conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee),
    ...await fixConseillersRecrutesUsersAndMiseEnRelations(db, conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee),
    ...await fixConseillersRecrutesUsersAndMiseEnRelations(db, conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee)
  ];

  const {
    conseillersWithInvalidUserCreated: conseillersWithInvalidUserCreatedWithDuplicates,
    conseillersWithInvalidDisponible: conseillersWithInvalidDisponibleWithDuplicates,
    conseillersWithInvalidEstRecrute: conseillersWithInvalidEstRecruteWithDuplicates
  } = conseillersRecruteWithDuplicatesPropertiesInspectionResult;
  await fixConseillersWithInvalidUserCreated(db, conseillersWithInvalidUserCreatedWithDuplicates);
  await fixConseillersWithInvalidDisponible(db, conseillersWithInvalidDisponibleWithDuplicates);
  await fixConseillersWithInvalidEstRecrute(db, conseillersWithInvalidEstRecruteWithDuplicates);

  return [
    ...conseillerWithoutConseillerRole,
    ...conseillersWithoutAssociatedUserToReimportInfo,
    ...conseillerWithoutFinaliseeStatusToReimportInfo,
    ...conseillersWithDuplicatesToReimport
  ].filter(conseillerInfo => conseillerInfo !== undefined);
};

const logIfAny = (message, quantity) => quantity > 0 && console.log(message, quantity);

const printReport = async (
  conseillersByEmail,
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

  console.log('Données sur le nombre de conseillers');
  console.log('');
  logIfAny('- Nombre total de conseillers :', conseillersByEmail.length);
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
};

const conseillersToReimportFileHeaders = [
  'Mail CNFS',
  'Prénom CNFS',
  'Nom CNFS',
  'Raison sociale',
  'Commune',
  'Code dpt',
  'Département',
  'Région',
  'Date de départ en formation',
  'Date de fin de formation',
  'ID structure',
  'SIRET',
  'mail SA'
];

const writeConseillersToReimportInCSVFile = conseillersToReimport => {
  const csvFile = path.join(__dirname, '../../../../data/exports', 'conseillers-to-reimport.csv');
  const file = fs.createWriteStream(csvFile, { flags: 'w' });

  file.write(`${conseillersToReimportFileHeaders.join(';')}\n`);

  conseillersToReimport.forEach(conseillerToReimport => {
    const fileLine = [
      conseillerToReimport.email,
      conseillerToReimport.prenom,
      conseillerToReimport.nom,
      conseillerToReimport.raisonSociale,
      conseillerToReimport.nomCommune,
      conseillerToReimport.codeDepartement,
      conseillerToReimport.departement,
      conseillerToReimport.region,
      moment(conseillerToReimport.datePrisePoste).format('DD/MM/yyyy'),
      moment(conseillerToReimport.dateFinFormation).format('DD/MM/yyyy'),
      conseillerToReimport.structureId,
      conseillerToReimport.siret,
      conseillerToReimport.mailSa,
    ];

    file.write(`${fileLine.join(';')}\n`);
  });

  file.close();
};

const getConseillersWithEmail = async (db, conseillerEmail) => {
  const allConseillersByEmail = await getConseillersByEmail(db);

  return program.email !== undefined ? allConseillersByEmail.filter(conseillerByEmail => conseillerByEmail._id === conseillerEmail) : allConseillersByEmail;
};

cli.description('Détecte des problèmes en base qui concernent la cohérence entre un conseiller et ses doublons, ainsi que les mises en relations et les users associés')
.option('-em, --email <email>', 'Adresse email du conseiller à analyser ou corriger, tous les conseillers recrutés seront pris en compte si ce paramètre n\'est pas défini')
.option('-f, --fix', 'Correction automatique des problèmes détectés quand cela est possible')
.helpOption('-e', 'Commande d\'aide')
.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {
  const conseillersByEmail = await getConseillersWithEmail(db, program.email);

  if (program.email !== undefined && conseillersByEmail.length === 0) {
    logger.warn(`Aucun conseiller avec l'email ${program.email} n'a été trouvé.`);
    exit();
    return;
  }

  const {
    noRecruteStatut,
    manyRecruteStatut,
    recruteStatutWithoutDuplicates,
    recruteStatutWithDuplicates,
  } = splitOnRecruteStatut(conseillersByEmail);

  const usersAssociatedWithConseillersWithoutDuplicatesInspectionResult = inspectUsersAssociatedWithConseillersWithoutDuplicates(
    await getConseillersWithMatchingUsersWithoutDuplicates(db, recruteStatutWithoutDuplicates));

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

  if (program.fix) {
    const conseillersToReimport = await fix(
      db,
      usersAssociatedWithConseillersWithoutDuplicatesInspectionResult,
      conseillersRecruteWithoutDuplicatesPropertiesInspectionResult,
      conseillersWithoutDuplicatesWithMatchingMiseEnRelationsOnStructureIdInspectionResult,
      conseillersWithMatchingMiseEnRelationsExceptStructureIdInspectionResultWithoutDuplicates,
      conseillersRecruteWithDuplicatesPropertiesInspectionResult,
      conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee,
      conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee,
      conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee);

    writeConseillersToReimportInCSVFile(conseillersToReimport);
  }

  await printReport(
    conseillersByEmail,
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
    usersAssociatedWithConseillersWithDuplicatesForConseillersWithStatutRecruteeAndNoDuplicateWithStatutFinaliseeInspectionResult);

  exit();
});
