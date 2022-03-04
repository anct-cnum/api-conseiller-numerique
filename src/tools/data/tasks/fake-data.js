const { name, internet, helpers, random, datatype } = require('faker');

module.exports = async () => {
  let prenom = name.firstName();
  let nom = name.lastName();
  let email = internet.exampleEmail(prenom, nom);
  let tel = random.arrayElement(['06', '07', '01']);
  let telephone = helpers.replaceSymbolWithNumber(`${tel}########`);

  let token = datatype.uuid();
  return {
    nom,
    prenom,
    email,
    telephone,
    token
  };
};
