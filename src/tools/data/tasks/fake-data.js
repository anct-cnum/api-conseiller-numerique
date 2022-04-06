const faker = require('@faker-js/faker/locale/de');
const { name, internet, helpers, random, datatype } = faker;
const { v4: uuidv4 } = require('uuid');

module.exports = async ({ idPG }) => {
  if (idPG) {
    faker.seed(idPG);
  }
  let prenom = name.firstName();
  let nom = name.lastName();
  let email = internet.exampleEmail(prenom, nom);
  let tel = random.arrayElement(['06', '07', '01', '02']);
  let telephone = helpers.replaceSymbolWithNumber(`${tel}########`);
  let token = datatype.uuid();
  const password = uuidv4();
  const tokenCreatedAt = new Date();
  nom = nom.toLowerCase();
  prenom = prenom.toLowerCase();
  email = email.toLowerCase();

  return {
    nom,
    prenom,
    email,
    telephone,
    token,
    password,
    tokenCreatedAt
  };
};
