const faker = require('@faker-js/faker/locale/fr');
const { name, internet, helpers, random, datatype } = faker;
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = async ({ idPG }) => {
  if (idPG) {
    faker.seed(idPG);
  }
  let prenom = name.firstName();
  let nom = name.lastName();
  let email = internet.exampleEmail(prenom, nom);
  let tel = random.arrayElement(['06', '07', '01', '02', '+336', '+337']);
  let telephone = helpers.replaceSymbolWithNumber(`${tel}########`);
  let token = datatype.uuid();
  let password = uuidv4();
  const tokenCreatedAt = new Date();
  nom = nom.toLowerCase();
  prenom = prenom.toLowerCase();
  email = email.toLowerCase();
  password = await bcrypt.hashSync(password);

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
