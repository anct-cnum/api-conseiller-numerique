#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-em, --email <email>', 'email: adresse mail du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let emailConseiller = program.email;
  if (!emailConseiller) {
    exit('Veuillez entrer un email avec la commande --email');
    return;
  }
  const conseillers = await db.collection('conseillers').find({ email: emailConseiller }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'total_donnee_candidat.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('nom; prenom; sexe; Date de naissance; email; telephone; Disponible; Cv renseigné; code Commune; nom Commune; code Departement; code Postal; code région; date d\'inscription; Date de disponibilité; distance max; date de confirmation de l\'email; Demandeur D\'emploi; En Emploi; En formation; Compte actif\n');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const {
        nom,
        prenom,
        sexe,
        dateDeNaissance,
        email,
        telephone,
        disponible,
        cv,
        codeCommune,
        nomCommune,
        codeDepartement,
        codePostal,
        codeRegion,
        createdAt,
        dateDisponibilite,
        distanceMax,
        emailConfirmedAt,
        estDemandeurEmploi,
        estEnEmploi,
        estEnFormation,
        userCreated
      } = conseiller;
      const compteEspace = await db.collection('users').findOne({ name: emailConseiller });
      file.write(`${nom ?? 'Non renseigné'};${prenom ?? 'Non renseigné'};${sexe ?? 'Non renseigné'};${dayjs(dateDeNaissance).format('DD/MM/YYYY')}; ${email};${telephone ?? 'Non renseigné'};${disponible === true ? 'OUI' : 'NON'}; ${cv === true ? 'OUI' : 'NON'};${codeCommune ?? 'Non renseigné'};${nomCommune ?? 'Non renseigné'}; ${codeDepartement ?? 'Non renseigné'};${codePostal ?? 'Non renseigné'}; ${codeRegion ?? 'Non renseigné'};${dayjs(createdAt).format('DD/MM/YYYY')};${dayjs(dateDisponibilite).format('DD/MM/YYYY')};${distanceMax};${dayjs(emailConfirmedAt).format('DD/MM/YYYY')};${estDemandeurEmploi === true ? 'OUI' : 'NON'};${estEnEmploi === true ? 'OUI' : 'NON'}; ${estEnFormation === true ? 'OUI' : 'NON'}; ${userCreated === false ? 'NON' : `OUI sur l'espace ${compteEspace.roles}`}`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});

