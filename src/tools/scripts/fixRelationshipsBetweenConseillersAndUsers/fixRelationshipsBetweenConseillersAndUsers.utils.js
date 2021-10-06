#!/usr/bin/env node
'use strict';

const MisesEnRelationStatut = {
  Nouvelle: 'nouvelle',
  NonInteressee: 'nonInteressee',
  Interessee: 'interessee',
  Finalisee: 'finalisee',
  Recrutee: 'recrutee',
  FinaliseeNonDisponible: 'finalisee_non_disponible',
  FinaliseeRupture: 'finalisee_rupture',
};

const ConseillerStatut = {
  Recrute: 'RECRUTE',
  Rupture: 'RUPTURE',
};

const toSimpleMiseEnRelation = (miseEnRelation) => ({
  _id: miseEnRelation._id.toString(),
  conseiller : miseEnRelation.conseiller.oid.toString(),
  structure : miseEnRelation.structure.oid.toString(),
  statut : miseEnRelation.statut
});

const isRecrute = conseiller => conseiller.statut === ConseillerStatut.Recrute;

const countRecrute = (conseillerIdsByEmail) => conseillerIdsByEmail.conseillers.reduce((count, conseiller) => count + (isRecrute(conseiller) ? 1 : 0), 0);

const hasDuplicates = conseillerIdsByEmail => conseillerIdsByEmail.conseillers.length > 1;

const updateResultCount = (conseillerIdsByEmail, result) => {
  const recruteNumber = countRecrute(conseillerIdsByEmail);

  if (recruteNumber === 0) return {...result, noRecruteStatut: [...result.noRecruteStatut, conseillerIdsByEmail]};
  if (recruteNumber === 1 && hasDuplicates(conseillerIdsByEmail)) return {...result, recruteStatutWithDuplicates: [...result.recruteStatutWithDuplicates, conseillerIdsByEmail]};
  if (recruteNumber === 1) return {...result, recruteStatutWithoutDuplicates: [...result.recruteStatutWithoutDuplicates, conseillerIdsByEmail]};

  return {...result, manyRecruteStatut: [...result.manyRecruteStatut, conseillerIdsByEmail]};
};

const splitOnRecruteStatut = conseillersIdsByEmail => {
  return conseillersIdsByEmail.reduce((result, conseillerIdsByEmail) => updateResultCount(conseillerIdsByEmail, result), {
    noRecruteStatut: [],
    manyRecruteStatut: [],
    recruteStatutWithoutDuplicates: [],
    recruteStatutWithDuplicates: [],
  });
};

const hasNoAssociatedUser = users => users.length === 0;

const hasMoreThanOneAssociatedUser = users => users.length > 1;

const isSameFullNameBetweenUserAndConseiller = (user, conseiller) => `${user.prenom} ${user.nom}` === `${conseiller.prenom} ${conseiller.nom}`;

const isConseillerNumeriqueEmail = user => user.name.endsWith('@conseiller-numerique.fr');

const hasConseillerRole = user => user.roles.includes('conseiller');

const inspectUsersAssociatedWithConseillers = conseillersWithMatchingUsers => conseillersWithMatchingUsers.reduce((result, conseillerWithMatchingUsers) => {
  const {users, conseiller} = conseillerWithMatchingUsers;

  if (hasNoAssociatedUser(users)) {
    result.conseillersWithoutAssociatedUser.push(conseiller);
    return result;
  }

  if (hasMoreThanOneAssociatedUser(users)) {
    result.conseillersAssociatedToMoreThanOneUser.push(conseiller);
    return result;
  }

  const user = users[0];

  !isSameFullNameBetweenUserAndConseiller(user, conseiller) && result.usersWithFullNameToFix.push({user: user, conseiller});
  !isConseillerNumeriqueEmail(user) && result.usersWithoutConseillerNumeriqueEmail.push(user);
  !hasConseillerRole(user) && result.usersAssociatedWithAConseillerWithoutConseillerRole.push(user);

  return result;
}, {
  conseillersWithoutAssociatedUser: [],
  conseillersAssociatedToMoreThanOneUser: [],
  usersWithFullNameToFix: [],
  usersWithoutConseillerNumeriqueEmail: [],
  usersAssociatedWithAConseillerWithoutConseillerRole: []
});

const hasNoAssociatedMiseEnRelation = misesEnRelations => misesEnRelations.length === 0;

const hasMoreThanOneAssociatedMiseEnRelation = misesEnRelations => misesEnRelations.length > 1;

const hasStatutFinalisee = misesEnRelation => misesEnRelation.statut === MisesEnRelationStatut.Finalisee;

const hasStatutRecrutee = misesEnRelation => misesEnRelation.statut === MisesEnRelationStatut.Recrutee;

const inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates = conseillersWithMatchingMiseEnRelations => conseillersWithMatchingMiseEnRelations.reduce((result, conseillerWithMatchingMiseEnRelations) => {
  const {misesEnRelations, conseiller} = conseillerWithMatchingMiseEnRelations;

  if (hasNoAssociatedMiseEnRelation(misesEnRelations)) {
    result.conseillersWithoutAssociatedMiseEnRelation.push(conseiller)
    return result;
  }

  if (hasMoreThanOneAssociatedMiseEnRelation(misesEnRelations)) {
    result.conseillersAssociatedToMoreThanOneMiseEnRelation.push(conseiller)
    return result;
  }

  const miseEnRelation = misesEnRelations[0];

  !hasStatutFinalisee(miseEnRelation) && result.misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus.push(miseEnRelation);

  return result;
}, {
  conseillersWithoutAssociatedMiseEnRelation: [],
  conseillersAssociatedToMoreThanOneMiseEnRelation: [],
  misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus: []
});

const hasFinaliseeNonDisponibleStatut = miseEnRelation => miseEnRelation.statut === MisesEnRelationStatut.FinaliseeNonDisponible;

const inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId = conseillersWithMatchingMiseEnRelations => conseillersWithMatchingMiseEnRelations.reduce((result, conseillerWithMatchingMiseEnRelations) => {
  result.misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus.push(
    ...conseillerWithMatchingMiseEnRelations.misesEnRelations.filter((miseEnRelation) => !hasFinaliseeNonDisponibleStatut(miseEnRelation))
  );

  return result;
}, {
  misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus: []
});

const hasConseillersWithMultipleMisesEnRelations = (conseillersWithMatchingMiseEnRelations) =>
  conseillersWithMatchingMiseEnRelations.filter(conseillerWithMatchingMiseEnRelations =>
    conseillerWithMatchingMiseEnRelations.misesEnRelations.length > 1).length > 0;

const countStatutsFinalisee = conseillersWithMatchingMiseEnRelations =>
  conseillersWithMatchingMiseEnRelations.reduce((result, conseillerWithMatchingMiseEnRelations) =>
    result + (conseillerWithMatchingMiseEnRelations.misesEnRelations.length > 0 && hasStatutFinalisee(conseillerWithMatchingMiseEnRelations.misesEnRelations[0]) ? 1 : 0), 0);

const countStatutsRecrutee = conseillersWithMatchingMiseEnRelations =>
  conseillersWithMatchingMiseEnRelations.reduce((result, conseillerWithMatchingMiseEnRelations) =>
    result + (conseillerWithMatchingMiseEnRelations.misesEnRelations.length > 0 && hasStatutRecrutee(conseillerWithMatchingMiseEnRelations.misesEnRelations[0]) ? 1 : 0), 0);

const hasMultipleStatutFinalisee = conseillersWithMatchingMiseEnRelations =>
  countStatutsFinalisee(conseillersWithMatchingMiseEnRelations) > 1;

const hasMultipleStatutRecrutee = conseillersWithMatchingMiseEnRelations =>
  countStatutsRecrutee(conseillersWithMatchingMiseEnRelations) > 1;

const hasStatutFinaliseeAndStatutRecrutee = conseillersWithMatchingMiseEnRelations =>
  countStatutsRecrutee(conseillersWithMatchingMiseEnRelations) === 1 && countStatutsFinalisee(conseillersWithMatchingMiseEnRelations) === 1;

const hasStatutFinaliseeAndNoStatutRecrute = conseillersWithMatchingMiseEnRelations =>
  countStatutsRecrutee(conseillersWithMatchingMiseEnRelations) === 0 && countStatutsFinalisee(conseillersWithMatchingMiseEnRelations) === 1;

const hasStatutRecruteAndNoStatutFinalisee = conseillersWithMatchingMiseEnRelations =>
  countStatutsRecrutee(conseillersWithMatchingMiseEnRelations) === 1 && countStatutsFinalisee(conseillersWithMatchingMiseEnRelations) === 0;

const hasNoStatutFinaliseeOrStatutRecrutee = conseillersWithMatchingMiseEnRelations =>
  countStatutsRecrutee(conseillersWithMatchingMiseEnRelations) === 0 && countStatutsFinalisee(conseillersWithMatchingMiseEnRelations) === 0;

const inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates = (conseillersAdDuplicatesWithMatchingMiseEnRelations) => {
  return conseillersAdDuplicatesWithMatchingMiseEnRelations.reduce((result, conseillersWithMatchingMiseEnRelations) => {
    hasConseillersWithMultipleMisesEnRelations(conseillersWithMatchingMiseEnRelations) && result.conseillersWithMultipleMisesEnRelations.push(conseillersWithMatchingMiseEnRelations);
    hasMultipleStatutFinalisee(conseillersWithMatchingMiseEnRelations) && result.conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee.push(conseillersWithMatchingMiseEnRelations);
    hasMultipleStatutRecrutee(conseillersWithMatchingMiseEnRelations) && result.conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee.push(conseillersWithMatchingMiseEnRelations);
    hasStatutFinaliseeAndStatutRecrutee(conseillersWithMatchingMiseEnRelations) && result.conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee.push(conseillersWithMatchingMiseEnRelations);
    hasStatutFinaliseeAndNoStatutRecrute(conseillersWithMatchingMiseEnRelations) && result.conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee.push(conseillersWithMatchingMiseEnRelations);
    hasStatutRecruteAndNoStatutFinalisee(conseillersWithMatchingMiseEnRelations) && result.conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee.push(conseillersWithMatchingMiseEnRelations);
    hasNoStatutFinaliseeOrStatutRecrutee(conseillersWithMatchingMiseEnRelations) && result.conseillersWithoutStatutFinaliseeOrStatutRecrutee.push(conseillersWithMatchingMiseEnRelations);

    return result;
  }, {
    conseillersWithMultipleMisesEnRelations: [],
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee: [],
    conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee: [],
    conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee: [],
    conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee: [],
    conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee: [],
    conseillersWithoutStatutFinaliseeOrStatutRecrutee: []
  })
};

module.exports = {
  MisesEnRelationStatut,
  ConseillerStatut,
  toSimpleMiseEnRelation,
  isRecrute,
  splitOnRecruteStatut,
  inspectUsersAssociatedWithConseillers,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
};
