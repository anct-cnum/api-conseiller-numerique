#!/usr/bin/env node
'use strict';

const {
  MisesEnRelationStatut,
  ConseillerStatut,
  splitOnRecruteStatut,
  inspectUsersAssociatedWithConseillersWithoutDuplicates,
  inspectUsersAssociatedWithConseillersWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
  inspectConseillersRecruteProperties,
  inspectConseillersAndDuplicatesProperties,
  resetConseiller
} = require('./fixRelationshipsBetweenConseillersAndUsers.utils');

const miseEnRelationJohnDoeStructureFinalisee= {
  _id : '7e1118b8a88220baa7e5533b',
  conseiller : 'f653637acd03bc52be4412f5',
  structure : 'cbfa2ca4bd2def7058af2d4a',
  statut : MisesEnRelationStatut.Finalisee
}
const miseEnRelationJohnDoeStructureRecrutee = {
  _id : 'a24ebcf41f79af289de2f14f',
  conseiller : 'f653637acd03bc52be4412f5',
  structure : '830484683810cc12ebaaadb13',
  statut : MisesEnRelationStatut.Recrutee
}
const miseEnRelationJohnDoeStructureNouvelle = {
  _id : 'c1ad70df659cd83013256547',
  conseiller : 'f653637acd03bc52be4412f5',
  structure : 'efa42834f8d0c915d8eb70d5',
  statut : MisesEnRelationStatut.Nouvelle
}
const miseEnRelationJohnDoeStructureFinaliseeNonDisponible = {
  _id : '09ab50a9232bb39241a9fa8e',
  conseiller : 'b596d13ee91d97a85a5c8ae4',
  structure : '14c596e420149b83b3fac421',
  statut : MisesEnRelationStatut.FinaliseeNonDisponible
}

const johnDoeConseiller = {
  _id: 'f653637acd03bc52be4412f5',
  prenom: 'john',
  nom: 'doe',
  email: 'john.doe@email.com',
  estRecrute: true,
  statut: ConseillerStatut.Recrute,
  structureId: 'cbfa2ca4bd2def7058af2d4a',
  disponible: false,
  mattermost: {
    error: false,
    login: 'john.doe',
    id: '3515e506438705b6fcc39d9ae2'
  },
  emailCN: {
    address: 'john.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
  userCreated: true,
  datePrisePoste: new Date(),
  dateFinFormation: new Date()
};
const johnDoeConseillerReset = {
  _id: 'f653637acd03bc52be4412f5',
  prenom: 'john',
  nom: 'doe',
  email: 'john.doe@email.com',
  estRecrute: false,
  disponible: true,
  structureId: 'cbfa2ca4bd2def7058af2d4a',
  userCreated: true
};
const johnDoeConseillerDuplicate = {
  _id: '97e7b703fd13cdb159668058',
  prenom: 'john',
  nom: 'doe',
  email: 'john.doe@email.com',
  estRecrute: false,
  structureId: '89dac23b5298d77e72c0dc97',
};
const johnDoeConseillerDuplicateWithRecruteStatut = {
  _id: '97e7b703fd13cdb159668058',
  prenom: 'john',
  nom: 'doe',
  email: 'john.doe@email.com',
  estRecrute: true,
  statut: ConseillerStatut.Recrute,
  structureId: '89dac23b5298d77e72c0dc97',
  mattermost: {
    error: false,
    login: 'john.doe',
    id: 'g1d98fg7s8dfg7s8f71g8s9df7'
  },
  emailCN: {
    address: 'john.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
};
const maryDoeConseiller = {
  _id: '15ceedaf1edc7b9a9b25e1bd',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  estRecrute: true,
  statut: ConseillerStatut.Recrute,
  structureId: 'e051967bc66f6fdbac924fd7',
  disponible: false,
  mattermost: {
    error: false,
    login: 'mary.doe',
    id: '7e62e72454f574180ee7a5b4eb'
  },
  emailCN: {
    address: 'mary.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
  userCreated: true,
  datePrisePoste: new Date(),
  dateFinFormation: new Date()
};
const maryDoeConseillerInvalid = {
  _id: '15ceedaf1edc7b9a9b25e1bd',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  estRecrute: false,
  statut: ConseillerStatut.Recrute,
  structureId: 'e051967bc66f6fdbac924fd7',
  disponible: true,
  emailCNError: false,
  datePrisePoste: new Date(),
  dateFinFormation: new Date()
};
const maryDoeConseillerDuplicate = {
  _id: 'a986da60804904c0968b3971',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  userCreated: false,
  disponible: true
};
const maryDoeConseillerInvalidDuplicate = {
  _id: 'a986da60804904c0968b3971',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  datePrisePoste: new Date(),
};
const maryDoeConseillerOtherInvalidDuplicate = {
  _id: '7aa69eb328175bbaf1832e4b',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  dateFinFormation: new Date()
};
const bobDoeConseiller = {
  _id: 'a8d0d761b65c263e17ae0d55',
  prenom: 'boby',
  nom: 'doe',
  email: 'bob.doe@email.com',
};
const oscarDoeConseiller = {
  _id: 'b596d13ee91d97a85a5c8ae4',
  prenom: 'oscar',
  nom: 'doe',
  email: 'oscar.doe@email.com',
  estRecrute: true,
  statut: ConseillerStatut.Rupture,
  structureId: '14c596e420149b83b3fac421',
  mattermost: {
    error: false,
    login: 'oscar.doe',
    id: '9b722a6d55efb01243d2efd2be'
  },
  emailCN: {
    address: 'oscar.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
};
const aliceDoeConseiller = {
  _id: '545ae206a795a42e82b2a867',
  prenom: 'alice',
  nom: 'doe',
  email: 'alice.doe@email.com',
  estRecrute: true,
  statut: ConseillerStatut.Recrute,
  structureId: '88e6298631da28d42c9b87cc',
  mattermost: {
    error: false,
    login: 'alice.doe',
    id: '3d5df25bbb55e5bd46ee64e579f'
  },
  emailCN: {
    address: 'alice.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
};
const henryDoeConseiller = {
  _id: '1018d7c1db894a6d8a3e65eb',
  prenom: 'henry',
  nom: 'doe',
  email: 'henry.doe@email.com',
  statut: ConseillerStatut.Recrute,
  mattermost: {
    error: true,
  },
  emailCNError: true,
};

const johnDoeUser = {
  _id: '5756be5b83c25951cb2d335b',
  prenom: 'john',
  nom: 'doe',
  name: 'john.doe@conseiller-numerique.fr',
  roles: ['conseiller'],
  conseillerId: 'f653637acd03bc52be4412f5',
};
const johnDoeUserCandidat = {
  _id: 'a8a97045721255ba60c3e65f',
  prenom: 'john',
  nom: 'doe',
  name: 'john.doe@conseiller-numerique.fr',
  roles: ['candidat'],
  conseillerId: 'f653637acd03bc52be4412f5',
};
const johnDoeUserDuplicate = {
  _id: 'ca28ee97a9f25d0b18d9b06a',
  prenom: 'john',
  nom: 'doe',
  roles: ['candidat'],
  conseillerId: '97e7b703fd13cdb159668058',
};
const bobDoeUser = {
  _id: 'db1e76a393856588484a4167',
  prenom: 'bob',
  nom: 'doe',
  name: 'bob.doe@email.fr',
  roles: ['candidat'],
  conseillerId: 'a8d0d761b65c263e17ae0d55',
};

const conseillersIdsByEmail = [
  {
    _id: johnDoeConseiller.email,
    conseillers: [
      {id: johnDoeConseiller._id, statut: johnDoeConseiller.statut},
      {id: johnDoeConseillerDuplicateWithRecruteStatut._id, statut: johnDoeConseillerDuplicateWithRecruteStatut.statut}
    ]
  },
  {
    _id: maryDoeConseiller.email,
    conseillers: [
      {id: maryDoeConseiller._id, statut: maryDoeConseiller.statut},
      {id: maryDoeConseillerDuplicate._id, statut: maryDoeConseillerDuplicate.statut}
    ]
  },
  {
    _id: bobDoeConseiller.email,
    conseillers: [{id: bobDoeConseiller._id, statut: bobDoeConseiller.statut}]
  },
  {
    _id: oscarDoeConseiller.email,
    conseillers: [{id: oscarDoeConseiller._id, statut: oscarDoeConseiller.statut}]
  },
  {
    _id: aliceDoeConseiller.email,
    conseillers: [{id: aliceDoeConseiller._id, statut: aliceDoeConseiller.statut}]
  }
];

describe('split conseillers on recrute statut', () => {
  it('should get conseillers without RECRUTE status', () => {
    const {noRecruteStatut} = splitOnRecruteStatut(conseillersIdsByEmail);

    expect(noRecruteStatut).toEqual([
      {
        _id: bobDoeConseiller.email,
        conseillers: [{id: bobDoeConseiller._id, statut: bobDoeConseiller.statut,}]
      },
      {
        _id: oscarDoeConseiller.email,
        conseillers: [{id: oscarDoeConseiller._id, statut: oscarDoeConseiller.statut,}]
      }
    ]);
  });

  it('should get conseiller with RECRUTE status, without duplicates', () => {
    const {recruteStatutWithoutDuplicates} = splitOnRecruteStatut(conseillersIdsByEmail);

    expect(recruteStatutWithoutDuplicates).toEqual([
      {
        _id: aliceDoeConseiller.email,
        conseillers: [{id: aliceDoeConseiller._id, statut: aliceDoeConseiller.statut}]
      }
    ]);
  });

  it('should get conseiller with RECRUTE status, with duplicates', () => {
    const {recruteStatutWithDuplicates} = splitOnRecruteStatut(conseillersIdsByEmail);

    expect(recruteStatutWithDuplicates).toEqual([
      {
        _id: maryDoeConseiller.email,
        conseillers: [
          {id: maryDoeConseiller._id, statut: maryDoeConseiller.statut},
          {id: maryDoeConseillerDuplicate._id, statut: maryDoeConseillerDuplicate.statut}
        ]
      }
    ]);
  });

  it('should get conseiller with many RECRUTE status', () => {
    const {manyRecruteStatut} = splitOnRecruteStatut(conseillersIdsByEmail);

    expect(manyRecruteStatut).toEqual([
      {
        _id: johnDoeConseiller.email,
        conseillers: [
          {id: johnDoeConseiller._id, statut: johnDoeConseiller.statut},
          {id: johnDoeConseillerDuplicateWithRecruteStatut._id, statut: johnDoeConseillerDuplicateWithRecruteStatut.statut}
        ]
      }
    ]);
  });
});

describe('inspect users associated with conseillers without duplicates', () => {
  it('should inspect users associated with conseillers and get empty array when all conseillers are associated with a user', () => {
    const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

    const {
      conseillersWithoutAssociatedUser,
      conseillersAssociatedToMoreThanOneUser
    } = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(conseillersWithoutAssociatedUser).toEqual([]);
    expect(conseillersAssociatedToMoreThanOneUser).toEqual([]);
  });

  it('should inspect users associated with conseillers and get the conseillers that are not associated with any user', () => {
    const conseillersWithMatchingUsers = [{users: [], conseiller: johnDoeConseiller}];

    const {conseillersWithoutAssociatedUser} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(conseillersWithoutAssociatedUser).toEqual([johnDoeConseiller]);
  });

  it('should inspect users associated with conseillers and get the conseillers that are associated with more than one user', () => {
    const conseillersWithMatchingUsers = [{users: [johnDoeUser, johnDoeUserDuplicate], conseiller: johnDoeConseiller}];

    const {conseillersAssociatedToMoreThanOneUser} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(conseillersAssociatedToMoreThanOneUser).toEqual([johnDoeConseiller]);
  });

  it('should inspect users associated with conseillers and get empty array when all users full name matches conseiller full name', () => {
    const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

    const {usersWithFullNameToFix} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersWithFullNameToFix).toEqual([]);
  });

  it('should inspect users associated with conseillers and get user in array when a user full name do not matches conseiller full name', () => {
    const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

    const {usersWithFullNameToFix} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersWithFullNameToFix).toEqual([{user: bobDoeUser, conseiller: bobDoeConseiller}]);
  });

  it('should inspect users associated with conseillers and get empty array when all users have a @conseiller-numerique.fr email', () => {
    const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

    const {usersWithoutConseillerNumeriqueEmail} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersWithoutConseillerNumeriqueEmail).toEqual([]);
  });

  it('should inspect users associated with conseillers and get user in array when a user email is not a @conseiller-numerique.fr email', () => {
    const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

    const {usersWithoutConseillerNumeriqueEmail} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersWithoutConseillerNumeriqueEmail).toEqual([bobDoeUser]);
  });

  it('should inspect users associated with conseillers and get empty array when all users have conseiller role', () => {
    const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

    const {usersAssociatedWithAConseillerWithoutConseillerRole} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersAssociatedWithAConseillerWithoutConseillerRole).toEqual([]);
  });

  it('should inspect users associated with conseillers and get users that do not have conseiller role', () => {
    const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

    const {usersAssociatedWithAConseillerWithoutConseillerRole} = inspectUsersAssociatedWithConseillersWithoutDuplicates(conseillersWithMatchingUsers);

    expect(usersAssociatedWithAConseillerWithoutConseillerRole).toEqual([bobDoeUser]);
  });
});

describe('inspect users associated with conseillers with duplicates', () => {
  it('should inspect users associated with conseillers and get empty array when conseiller recrute or one of its duplicates is associated with a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersWithoutAnyConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersWithoutAnyConseillerUser).toEqual([]);
  });

  it('should inspect users associated with conseillers and get conseiller in array when neither a conseiller recrute nor one of his duplicates is associated with a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersWithoutAnyConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersWithoutAnyConseillerUser).toEqual([johnDoeConseiller]);
  });

  it('should inspect users associated with conseillers recrutes and get empty array when all conseillers recrutes are associated with one user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersRecrutesAssociatedToMoreThanOneUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersRecrutesAssociatedToMoreThanOneUser).toEqual([]);
  });

  it('should inspect users associated with conseillers recrutes and get the conseillers recrutes that are associated with more than one user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser, johnDoeUserDuplicate], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersRecrutesAssociatedToMoreThanOneUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersRecrutesAssociatedToMoreThanOneUser).toEqual([johnDoeConseiller]);
  });

  it('should inspect users associated with conseillers recrutes and get empty array when there is not any conseiller recrute that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUserCandidat], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersRecrutesWithAConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersRecrutesWithAConseillerUser).toEqual([]);
  });

  it('should inspect users associated with conseillers recrutes and get the conseillers recrutes that are associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser], conseiller: johnDoeConseiller},
        {users: [johnDoeUserDuplicate], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersRecrutesWithAConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersRecrutesWithAConseillerUser).toEqual([johnDoeConseiller]);
  });

  it('should inspect users associated with conseillers duplicates and get empty array when there is not any conseiller duplicate that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser], conseiller: johnDoeConseiller},
        {users: [], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersDuplicatesWithAConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersDuplicatesWithAConseillerUser).toEqual([]);
  });

  it('should inspect users associated with conseillers duplicates and get conseiller duplicate when there is a conseiller duplicate that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [], conseiller: johnDoeConseiller},
        {users: [johnDoeUser], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {conseillersDuplicatesWithAConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(conseillersDuplicatesWithAConseillerUser).toEqual([
      [johnDoeConseillerDuplicate]
    ]);
  });

  it('should inspect users associated with conseillers duplicates and get empty array when there is no conseiller recrute that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [johnDoeUser], conseiller: johnDoeConseiller},
        {users: [], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {noConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(noConseillerUser).toEqual([]);
  });

  it('should inspect users associated with conseillers duplicates and get empty array when there is no conseiller duplicate that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [], conseiller: johnDoeConseiller},
        {users: [johnDoeUser], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {noConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(noConseillerUser).toEqual([]);
  });

  it('should inspect users associated with conseillers duplicates and get conseiller recrute when there is no conseiller recrute or conseiller duplicate that is associated to a conseiller user', () => {
    const conseillersWithMatchingUsersWithDuplicates = [
      [
        {users: [], conseiller: johnDoeConseiller},
        {users: [], conseiller: johnDoeConseillerDuplicate}
      ]
    ];

    const {noConseillerUser} = inspectUsersAssociatedWithConseillersWithDuplicates(conseillersWithMatchingUsersWithDuplicates);

    expect(noConseillerUser).toEqual([johnDoeConseiller]);
  });
});

describe('inspect mises en relations associated with conseillers on structure id without duplicates', () => {
  it('should inspect mises en relations associated with conseillers and get empty array when all conseillers are associated with a mise en relation', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle], conseiller: johnDoeConseiller}];

    const {
      conseillersWithoutAssociatedMiseEnRelation,
      conseillersAssociatedToMoreThanOneMiseEnRelation
    } = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithoutAssociatedMiseEnRelation).toEqual([]);
    expect(conseillersAssociatedToMoreThanOneMiseEnRelation).toEqual([]);
  });

  it('should inspect mises en relations associated with conseillers and get the conseillers that are not associated with any mise en relation', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [], conseiller: johnDoeConseiller}];

    const {conseillersWithoutAssociatedMiseEnRelation} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithoutAssociatedMiseEnRelation).toEqual([johnDoeConseiller]);
  });

  it('should inspect mises en relations associated with conseillers and get the conseillers that are associated with more than one mise en relation', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee, miseEnRelationJohnDoeStructureNouvelle], conseiller: johnDoeConseiller}];

    const {conseillersAssociatedToMoreThanOneMiseEnRelation} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersAssociatedToMoreThanOneMiseEnRelation).toEqual([johnDoeConseiller]);
  });

  it('should inspect mises en relations associated with conseillers and get empty array when no mises en relations without finalisee status in array', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee], conseiller: johnDoeConseiller}];

    const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus).toEqual([]);
  });

  it('should inspect mises en relations associated with conseillers and get empty array when all status are finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee], conseiller: johnDoeConseiller}];

    const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus).toEqual([]);
  });

  it('should inspect mises en relations associated with conseillers and get mises en relations without finalisee status in array', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle], conseiller: johnDoeConseiller}];

    const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus).toEqual([miseEnRelationJohnDoeStructureNouvelle]);
  });
});

describe('inspect mises en relations associated with conseillers except structure id', () => {
  it('should inspect mises en relations associated with conseillers and get mises en relations without finalisee_non_disponible status in array', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible], conseiller: johnDoeConseiller}];

    const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus} = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(conseillersWithMatchingMiseEnRelations);

    expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus).toEqual([]);
  });

  it('should inspect mises en relations associated with conseillers and get all mises en relations with non finalisee_non_disponible status in array', () => {
    const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle, miseEnRelationJohnDoeStructureRecrutee, miseEnRelationJohnDoeStructureFinaliseeNonDisponible], conseiller: johnDoeConseiller}];

    const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus} = inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId(conseillersWithMatchingMiseEnRelations);

    expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeNonDisponibleStatus).toEqual([
      miseEnRelationJohnDoeStructureNouvelle,
      miseEnRelationJohnDoeStructureRecrutee
    ]);
  });
});

describe('inspect mises en relations associated with conseillers on structure id with duplicates', () => {
  it('should get empty array when there is no conseiller with multiple mises en relations', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithMultipleMisesEnRelations} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithMultipleMisesEnRelations).toEqual([]);
  });

  it('should get the conseiller and duplicates with multiple mises en relations', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible, miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithMultipleMisesEnRelations} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithMultipleMisesEnRelations).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible, miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is no conseiller and duplicates both associated with a mise en relation with statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee).toEqual([]);
  });

  it('should get conseiller and duplicates when conseiller and duplicates both associated with a mise en relation with statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndDuplicatesWithStatutFinalisee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is no conseiller and duplicates both associated with a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee).toEqual([]);
  });

  it('should get conseiller and duplicates when conseiller and duplicates both associated with a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutRecruteeAndDuplicatesWithStatutRecrutee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is no conseiller associated to a mise en relation with statut finalisee and duplicate associated with a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee).toEqual([]);
  });

  it('should get conseiller and duplicate when conseiller is associated to a mise en relation with statut finalisee and a duplicate is associated with a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndDuplicatesWithStatutRecrutee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is no conseiller associated to a mise en relation with statut finalisee and a duplicate associated to a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee).toEqual([]);
  });

  it('should get conseiller associated to a mise en relation with statut finalisee and a duplicate not associated to a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutFinaliseeAndNoDuplicateWithStatutRecrutee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is no conseiller associated to a mise en relation with statut recrutee and a duplicate associated to a mise en relation with statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee).toEqual([]);
  });

  it('should get conseiller associated to a mise en relation with statut recrutee and a duplicate not associated to a mise en relation with statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithStatutRecruteeAndNoDuplicateWithStatutFinalisee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });

  it('should get an empty array when there is a conseiller associated with a mise en relation with statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithoutStatutFinaliseeOrStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithoutStatutFinaliseeOrStatutRecrutee).toEqual([]);
  });

  it('should get an empty array when there is a conseiller associated with a mise en relation with statut recrutee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureRecrutee],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithoutStatutFinaliseeOrStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithoutStatutFinaliseeOrStatutRecrutee).toEqual([]);
  });

  it('should get conseillers associated to mise en relations without statut recrutee or statut finalisee', () => {
    const conseillersWithMatchingMiseEnRelations = [
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseiller
        }
      ]
    ];

    const {conseillersWithoutStatutFinaliseeOrStatutRecrutee} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithDuplicates(conseillersWithMatchingMiseEnRelations);

    expect(conseillersWithoutStatutFinaliseeOrStatutRecrutee).toEqual([
      [
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureNouvelle],
          conseiller: johnDoeConseillerDuplicate
        },
        {
          misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible],
          conseiller: johnDoeConseiller
        }
      ]
    ]);
  });
});

describe('inspect conseiller RECRUTE properties', () => {
  it('should get empty conseillers invalid date fin formation array when a conseiller with RECRUTE statut has a valid date de fin de formation', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDateFinFormation} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDateFinFormation).toEqual([]);
  });

  it('should get the conseiller in conseillers invalid date fin formation array when a conseiller with RECRUTE statut has no date de fin de formation', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDateFinFormation} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDateFinFormation).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers invalid date prise poste array when a conseiller with RECRUTE statut has a valid date de prise de poste', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDatePrisePoste} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDatePrisePoste).toEqual([]);
  });

  it('should get the conseiller in conseillers invalid date prise poste array when a conseiller with RECRUTE statut has no date de prise de poste', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDatePrisePoste} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDatePrisePoste).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers invalid user created array when a conseiller with RECRUTE statut has a valid user created property', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidUserCreated} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidUserCreated).toEqual([]);
  });

  it('should get conseiller in conseillers invalid user created array when a conseiller with RECRUTE statut has an invalid user created property', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidUserCreated} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidUserCreated).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers invalid structure id array when a conseiller with RECRUTE statut has a valid structure id property', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidStructureId} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidStructureId).toEqual([]);
  });

  it('should get conseiller in conseillers invalid structure id array when a conseiller with RECRUTE statut has an invalid structure id property', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidStructureId} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidStructureId).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers invalid est recrute array when a conseiller with RECRUTE statut has a valid est recrute property', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidEstRecrute} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidEstRecrute).toEqual([]);
  });

  it('should get conseiller in conseillers invalid est recrute array when a conseiller with RECRUTE statut has an invalid est recrute property', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidEstRecrute} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidEstRecrute).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers invalid disponible array when a conseiller with RECRUTE statut has a valid disponible property', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDisponible} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDisponible).toEqual([]);
  });

  it('should get conseiller in conseillers invalid disponible array when a conseiller with RECRUTE statut has an invalid disponible property', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithInvalidDisponible} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithInvalidDisponible).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers with mattermost error array when a conseiller with RECRUTE statut has no mattermost error', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithMattermostError} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithMattermostError).toEqual([]);
  });

  it('should get conseiller in conseillers with mattermost error array when a conseiller with RECRUTE statut has a mattermost error', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithMattermostError} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithMattermostError).toEqual([henryDoeConseiller]);
  });

  it('should get empty conseillers with email CN error array when a conseiller with RECRUTE statut has no email CN error', () => {
    const conseillersByEmail = [
      {
        _id: johnDoeConseiller.email,
        conseillers: [johnDoeConseiller]
      }
    ];

    const {conseillersWithEmailCNError} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithEmailCNError).toEqual([]);
  });

  it('should get conseiller in conseillers with email CN error array when a conseiller with RECRUTE statut has an email CN error', () => {
    const conseillersByEmail = [
      {
        _id: henryDoeConseiller.email,
        conseillers: [henryDoeConseiller]
      }
    ];

    const {conseillersWithEmailCNError} = inspectConseillersRecruteProperties(conseillersByEmail);

    expect(conseillersWithEmailCNError).toEqual([henryDoeConseiller]);
  });
});

describe('inspect conseillers and duplicates properties in conseillers with matching mises en relations groups', () => {
  it('should inspect conseillers and duplicates properties and get valid conseiller recrute and all valid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee], conseiller: maryDoeConseiller},
        {misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible], conseiller: maryDoeConseillerDuplicate}
      ]
    ];

    const {validRecruteAllValidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(validRecruteAllValidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseiller,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: []
      }
    ]);
  });

  it('should inspect conseillers and duplicates properties and get valid conseiller recrute and one invalid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [], conseiller: maryDoeConseiller},
        {misesEnRelations: [], conseiller: maryDoeConseillerDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalidDuplicate}
      ]
    ];

    const {validRecruteOneInvalidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(validRecruteOneInvalidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseiller,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: [maryDoeConseillerInvalidDuplicate]
      }
    ]);
  });

  it('should inspect conseillers and duplicates properties and get valid conseiller recrute and many invalid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [], conseiller: maryDoeConseiller},
        {misesEnRelations: [], conseiller: maryDoeConseillerDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalidDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerOtherInvalidDuplicate}
      ]
    ];

    const {validRecruteManyInvalidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(validRecruteManyInvalidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseiller,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: [maryDoeConseillerInvalidDuplicate, maryDoeConseillerOtherInvalidDuplicate]
      }
    ]);
  });

  it('should inspect conseillers and duplicates properties and get invalid conseiller recrute and all valid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee], conseiller: maryDoeConseillerInvalid},
        {misesEnRelations: [miseEnRelationJohnDoeStructureFinaliseeNonDisponible], conseiller: maryDoeConseillerDuplicate}
      ]
    ];

    const {invalidRecruteAllValidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(invalidRecruteAllValidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseillerInvalid,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: []
      }
    ]);
  });

  it('should inspect conseillers and duplicates properties and get invalid conseiller recrute and one invalid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalid},
        {misesEnRelations: [], conseiller: maryDoeConseillerDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalidDuplicate}
      ]
    ];

    const {invalidRecruteOneInvalidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(invalidRecruteOneInvalidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseillerInvalid,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: [maryDoeConseillerInvalidDuplicate]
      }
    ]);
  });

  it('should inspect conseillers and duplicates properties and get invalid conseiller recrute and many invalid conseiller duplicates', () => {
    const conseillersWithMatchingMiseEnRelationsGroups = [
      [
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalid},
        {misesEnRelations: [], conseiller: maryDoeConseillerDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerInvalidDuplicate},
        {misesEnRelations: [], conseiller: maryDoeConseillerOtherInvalidDuplicate}
      ]
    ];

    const {invalidRecruteManyInvalidDuplicates} = inspectConseillersAndDuplicatesProperties(conseillersWithMatchingMiseEnRelationsGroups);

    expect(invalidRecruteManyInvalidDuplicates).toEqual([
      {
        conseillerRecrute: maryDoeConseillerInvalid,
        validConseillersDuplicates: [maryDoeConseillerDuplicate],
        invalidConseillersDuplicates: [maryDoeConseillerInvalidDuplicate, maryDoeConseillerOtherInvalidDuplicate]
      }
    ]);
  });

  describe('reset conseiller', () => {
    it('should reset conseiller', () => {
      const newConseiller = resetConseiller(johnDoeConseiller);

      expect(newConseiller).toEqual(johnDoeConseillerReset)
    });
  });
});
