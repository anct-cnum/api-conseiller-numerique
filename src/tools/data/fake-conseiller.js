const { program } = require('commander');
const { execute } = require('../utils');
const { name, internet } = require('faker');


execute(__filename, async ({ db, logger, Sentry, exit }) => {
  let prenom = name.firstName();
  let nom = name.lastName();
  let email = internet.email(prenom, nom);

  const conseillerNonRecrute = {
    nom,
    prenom,
    email
  };
  console.log(conseillerNonRecrute);
  exit();
});
