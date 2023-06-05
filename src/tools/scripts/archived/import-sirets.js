const CSVToJSON = require('csvtojson');
const { Pool } = require('pg');
const { program } = require('commander');
const { getEtablissementBySiretEntrepriseApiV3, getEntrepriseBySirenEntrepriseApiV3 } = require('../../../utils/entreprise.api.gouv');
program.version('0.0.1');

program
.option('-t, --token <token>', 'token api entreprise')
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const pool = new Pool();

// Vérifie un SIRET (établissement) avec l'API Entreprise
const checkSiret = async siret => {
  try {
    const resultEtablissement = await getEtablissementBySiretEntrepriseApiV3(siret, this.app.get('api_entreprise'));
    return resultEtablissement;
  } catch (err) {
    throw err;
  }
};

// Vérifie un SIREN (entreprise) avec l'API Entreprise
const checkSiren = async siren => {
  try {
    const res = await getEntrepriseBySirenEntrepriseApiV3(siren, this.app.get('api_entreprise'));
    return res;
  } catch (err) {
    throw err;
  }
};

// CSV LimeSurvey
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON().fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const updateDB = async (email, entreprise, conseillers) => {
  try {
    const { rows } = await pool.query('SELECT * FROM djapp_hostorganization WHERE LOWER(contact_email) LIKE LOWER(\'%\' || $1 || \'%\')', [email]);
    if (rows.length > 0) {
      console.log(`Email trouvé : ${rows[0].contact_email} ${rows[0].id}`);
      await pool.query('UPDATE djapp_hostorganization SET siret=$1, coaches_requested=$2 WHERE id=$3',
        [entreprise.siret_siege_social, ~~conseillers, rows[0].id]);
    } else {
      console.log(`Email inconnu : ${email}`);
    }
  } catch (error) {
    console.log(`Erreur DB : ${error.message} pour l'adresse ${email}`);
  }
};

readCSV(program.csv).then(async replies => {
  for (const reply of replies) {
    const siret = reply['Quel est votre numéro SIRET ?'].replace(/\s/g, '');
    const id = reply['ID de la réponse'];
    const email = reply['Pouvez-vous nous rappeler l’adresse mail avec laquelle vous avez reçu ce message ?'];
    const conseillers = reply['Combien de conseillers numériques souhaitez-vous accueillir ?'];

    if (/\d{14}/.test(siret)) {
      const siren = siret.substring(0, 9);
      try {
        await checkSiret(siret);
        //const infosEtablissement = await checkSiret(siret);
        // infosEtablissement.adresse
        const infosEntreprise = await checkSiren(siren);
        // infosEntreprise?.unite_legale?.personne_morale_attributs?.raison_sociale
        console.log(`OK ${id} ${siret} ${infosEntreprise?.unite_legale?.personne_morale_attributs?.raison_sociale}`);

        await updateDB(email, infosEntreprise, conseillers);
      } catch (error) {
        console.log(`KO ${id} ${siret} : ${error.message}`);
      }
    } else {
      console.log(`KO ${id} ${siret} : siret mauvais format`);
    }
  }
}).catch(error => {
  console.log(error.message);
});
