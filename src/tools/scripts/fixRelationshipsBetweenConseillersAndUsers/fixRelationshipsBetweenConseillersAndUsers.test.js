#!/usr/bin/env node
'use strict';

const {
  MisesEnRelationStatut,
  ConseillerStatut,
  splitOnRecruteStatut,
  inspectUsersAssociatedWithConseillers,
  inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates,
  inspectMisesEnRelationsAssociatedWithConseillersExceptStructureId,
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
const johnDoeConseillerDuplicate = {
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
  mattermost: {
    error: false,
    login: 'mary.doe',
    id: '7e62e72454f574180ee7a5b4eb'
  },
  emailCN: {
    address: 'mary.doe@conseiller-numerique.fr'
  },
  emailCNError: false,
};
const maryDoeConseillerDuplicate = {
  _id: 'a986da60804904c0968b3971',
  prenom: 'mary',
  nom: 'doe',
  email: 'mary.doe@email.com',
  estRecrute: false,
};
const bobDoeConseiller = {
  _id: 'a8d0d761b65c263e17ae0d55',
  prenom: 'boby',
  nom: 'doe',
  email: 'bob.doe@email.com',
  estRecrute: undefined,
  statut: undefined,
  structureId: undefined,
  mattermost: undefined,
  emailCN: undefined,
  emailCNError: undefined,
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

const johnDoeUser = {
  _id: '5756be5b83c25951cb2d335b',
  prenom: 'john',
  nom: 'doe',
  name: 'john.doe@conseiller-numerique.fr',
  roles: ['conseiller'],
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
      {id: johnDoeConseillerDuplicate._id, statut: johnDoeConseillerDuplicate.statut}
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

describe('fix relationships between conseillers and users', () => {
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
          {id: johnDoeConseillerDuplicate._id, statut: johnDoeConseillerDuplicate.statut}
        ]
      }
    ]);
  });

  describe('inspect users associated with conseillers', () => {
    it('should inspect users associated with conseillers and get empty array when all conseillers are associated with a user', () => {
      const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

      const {
        conseillersWithoutAssociatedUser,
        conseillersAssociatedToMoreThanOneUser
      } = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(conseillersWithoutAssociatedUser).toEqual([]);
      expect(conseillersAssociatedToMoreThanOneUser).toEqual([]);
    });

    it('should inspect users associated with conseillers and get the conseillers that are not associated with any user', () => {
      const conseillersWithMatchingUsers = [{users: [], conseiller: johnDoeConseiller}];

      const {conseillersWithoutAssociatedUser} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(conseillersWithoutAssociatedUser).toEqual([johnDoeConseiller]);
    });

    it('should inspect users associated with conseillers and get the conseillers that are associated with more than one user', () => {
      const conseillersWithMatchingUsers = [{users: [johnDoeUser, johnDoeUserDuplicate], conseiller: johnDoeConseiller}];

      const {conseillersAssociatedToMoreThanOneUser} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(conseillersAssociatedToMoreThanOneUser).toEqual([johnDoeConseiller]);
    });

    it('should inspect users associated with conseillers and get empty array when all users full name matches conseiller full name', () => {
      const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

      const {usersWithFullNameToFix} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersWithFullNameToFix).toEqual([]);
    });

    it('should inspect users associated with conseillers and get user in array when a user full name do not matches conseiller full name', () => {
      const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

      const {usersWithFullNameToFix} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersWithFullNameToFix).toEqual([{user: bobDoeUser, conseiller: bobDoeConseiller}]);
    });

    it('should inspect users associated with conseillers and get empty array when all users have a @conseiller-numerique.fr email', () => {
      const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

      const {usersWithoutConseillerNumeriqueEmail} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersWithoutConseillerNumeriqueEmail).toEqual([]);
    });

    it('should inspect users associated with conseillers and get user in array when a user email is not a @conseiller-numerique.fr email', () => {
      const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

      const {usersWithoutConseillerNumeriqueEmail} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersWithoutConseillerNumeriqueEmail).toEqual([bobDoeUser]);
    });

    it('should inspect users associated with conseillers and get empty array when all users have conseiller role', () => {
      const conseillersWithMatchingUsers = [{users: [johnDoeUser], conseiller: johnDoeConseiller}];

      const {usersAssociatedWithAConseillerWithoutConseillerRole} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersAssociatedWithAConseillerWithoutConseillerRole).toEqual([]);
    });

    it('should inspect users associated with conseillers and get users that do not have conseiller role', () => {
      const conseillersWithMatchingUsers = [{users: [bobDoeUser], conseiller: bobDoeConseiller}];

      const {usersAssociatedWithAConseillerWithoutConseillerRole} = inspectUsersAssociatedWithConseillers(conseillersWithMatchingUsers);

      expect(usersAssociatedWithAConseillerWithoutConseillerRole).toEqual([bobDoeUser]);
    });

    it('should inspect mises en relations associated with conseillers and get empty array when all status are finalisee', () => {
      const conseillersWithMatchingMiseEnRelations = [{misesEnRelations: [miseEnRelationJohnDoeStructureFinalisee], conseiller: johnDoeConseiller}];

      const {misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus} = inspectMisesEnRelationsAssociatedWithConseillersOnStructureIdWithoutDuplicates(conseillersWithMatchingMiseEnRelations);

      expect(misesEnRelationsAssociatedWithAConseillerWithoutFinaliseeStatus).toEqual([]);
    });
  });

  describe('inspect mises en relations associated with conseillers on structure id', () => {
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
});
