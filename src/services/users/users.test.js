/* eslint-disable no-undef */
const assert = require('assert');
const app = require('../../app');
const supertest = require('supertest');

describe('\'users\' service', () => {
  it('registered the service', () => {
    const service = app.service('users');

    assert.ok(service, 'Registered the service');
  });

  // it("creates a user, encrypts and removes password for external requests", async () => {
  //   const params = { provider: "rest" };

  //   const user = await app.service("users").create(
  //     {
  //       name: "test2@example.com",
  //       password: "secret",
  //     },
  //     params
  //   );
  //   assert.ok(user.password !== "secret");
  //   assert.ok(!user.password);
  // });
  describe('get user routes', () => {
    describe('get all the users of one structure', () => {
      
      it('should return a 404 not found', async () => {
        const structureId = '1234';
        await supertest(app).get(`/users/listByIdStructure/${structureId}`).expect(404);
      });
      it('should return a 200 and the users with the same structure id', async () => {
        const structureId = '60461fad871498b5cec2028e';
        const expected = [{ _id: '60463a840fc631086b129c1b',
          name: 's.caillault@mairie-chambery.fr',
          roles: ['structure', 'structure_coop', 'conseiller'],
          passwordCreated: true }];
        const { body, statusCode } = await supertest(app)
        .get(`/users/listByIdStructure/${structureId}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(expect.arrayContaining(expected));
      });
    });
    describe('get user by his token and check if it\'s a consultant, if yes get his email to display it', () => {
      
      it('should return a 404 not found', async () => {
        const token = '1234';
        await supertest(app).get(`/users/verifyToken/${token}`).expect(404);
      });
      it('should return a 200 and the consultant roles and email', async () => {
        const expectedNonConsultant = {
          name: 's.caillault@mairie-chambery.fr',
          roles: [Array],
        };
        const expectedConsultant = {
          name: 's.caillault@mairie-chambery.fr',
          roles: ['structure', 'structure_coop', 'conseiller'],
          persoEmail: 's.caillault@mairie-chambery.fr',
          nom: 'caillault',
          prenom: 'Sandrine',
          support_cnfs: false
        };
        const token = 'f82c6f07-bc4f-4ba5-929f-06f303eded1a';
        const { body, statusCode } = await supertest(app)
        .get(`/users/verifyToken/${token}`);
        expect(statusCode).toBe(200);
        if (body.roles.includes('conseillers')) {
          expect(body).objectContaining(expectedConsultant);
        } else {
          expect(body).objectContaining(expectedNonConsultant);
        }
      });
    });
  });
  describe('patch user routes', () => {
    describe('find a user by id and update his email', () => {
      
      it('should return a 409 already exist', async () => {
        const id = '60463a840fc631086b129c1b';
        const requestBody = { name: 's.caillault@mairiechambery.fr' };
        await supertest(app).patch(`/users/sendEmailUpdate/${id}`).send(requestBody).expect(409);
      });
      it('should return a 200 and the updated user', async () => {
        const expected = { _id: '60463a840fc631086b129c1b',
          name: 's.caillault@mairiechambery.fr',
          password: '$2a$10$vzGgpGofFGQ7lTz9LX2oe.VysXUmDqYBIRDyDBHMUvdWNrgciO05O',
          roles: ['structure', 'structure_coop', 'conseiller'],
          entity: [
            {
              '$ref': 'structures',
              '$id': '60461fad871498b5cec2028e',
              '$db': 'bwpnvys3yebazesqg4wh'
            }
          ],
          token: 'c5bab35e-a036-41ff-a2cf-f2db566d9767',
          mailSentDate: 'Fri Oct 08 2021 14:40:24 GMT+0200 (Central European Summer Time)',
          passwordCreated: true,
          createdAt: 2021,
          resend: false,
          tokenCreatedAt: null,
          mailAModifier: 'nouveau@email.com',
          mailCoopSent: true,
          updatedAt: 2022, mailConfirmError: 'smtpError',
          mailConfirmErrorDetail: 'connect ECONNREFUSED 127.0.0.1:1025' };
        const id = '60463a840fc631086b129c1b';
        const requestBody = { name: 'nouveau@email.com' };
        const { body, statusCode } = await await supertest(app).patch(`/users/sendEmailUpdate/${id}`).send(requestBody);
        expect(statusCode).toBe(200);
        expect(Object.keys(body)).toEqual(Object.keys(expected));
      });
    });
    describe('update consultant by id', () => {
      
      it('should return a 400 schema error', async () => {
        const id = '60463a840fc631086b129c1b';
        const requestBody = { email: 'nouveaumail.fr' };
        await supertest(app).patch(`/candidat/updateInfosCandidat/${id}`).send(requestBody).expect(400);
      });
      it('should return a 200 and the updated user', async () => {
        const id = '60463a840fc631086b129c1b';
        const requestBody = { nom: 'henke', prenom: 'emmanuel', telephone: '0123456789', email: 'nouveau@mail.fr' };
        const { body, statusCode } = await await supertest(app).patch(`/candidat/updateInfosCandidat/${id}`).send(requestBody);
        expect(statusCode).toBe(200);
      });
    });
    describe('post user routes', () => {
      it('should return a 409 already exist', async () => {
        const requestBody = { email: 's.caillault@mairie-chambery.fr', structureId: '60461fad871498b5cec2028e' };
        await supertest(app).post(`/users/inviteStructure`).send(requestBody).expect(409);
      });
      it('should return a 200 and a new user', async () => {
        const requestBody = { email: 'nouveau@email.fr', structureId: '60461fad871498b5cec2028e' };
        await supertest(app).post(`/users/inviteStructure`).send(requestBody).expect(200);
      });
    });
  });
});
