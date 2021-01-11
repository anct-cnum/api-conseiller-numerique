const axios = require('axios');
const CSVToJSON = require('csvtojson');
const fs = require('fs');
const { Pool } = require('pg');
const { program } = require('commander');
program.version('0.0.1');

program
  .option('-t, --token <token>', 'token api entreprise')
  .option('-c, --csv <path>', 'CSV file path')

program.parse(process.argv);

const params =  {
  token: program.token,
  context: 'cnum',
  recipient: 'cnum',
  object: 'checkSiret',
};

const pool = new Pool();

// Vérifie un SIRET (établissement) avec l'API Entreprise
const checkSiret = async (siret) => {
  const url = `https://entreprise.api.gouv.fr/v2/etablissements/${siret}`;

  try {
    const res = await axios.get(url, { params: params });
    return res.data.etablissement;
  } catch (err) {
    throw err;
  }
};

// Vérifie un SIREN (entreprise) avec l'API Entreprise
const checkSiren = async (siren) => {
  const url = `https://entreprise.api.gouv.fr/v2/entreprises/${siren}`;

  try {
    const res = await axios.get(url, { params: params });
    return res.data;
  } catch (err) {
    throw err;
  }
};

// CSV LimeSurvey
const readCSV = async (filePath) => {
  try {
    const users = await CSVToJSON().fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const updateDB = async (email, entreprise, conseillers) => {
  try {
    const { rows } = await pool.query("SELECT * FROM djapp_hostorganization WHERE LOWER(contact_email) LIKE LOWER('%' || $1 || '%')", [email])
    if (rows.length > 0) {
      console.log(`Email trouvé : ${rows[0].contact_email} ${rows[0].id}`);
      const { result } = await pool.query("UPDATE djapp_hostorganization SET siret=$1, coaches_requested=$2 WHERE id=$3", [entreprise.siret_siege_social, ~~conseillers, rows[0].id])
    } else {
      console.log(`Email inconnu : ${email}`);
    }
  } catch (error) {
    console.log(`Erreur DB : ${error.message} pour l'adresse ${email}`);
  }
}

readCSV(program.csv).then(async (replies) => {
  for (const reply of replies) {
    const siret = reply['Quel est votre numéro SIRET ?'].replace(/\s/g,'');
    const id = reply['ID de la réponse'];
    const email = reply['Pouvez-vous nous rappeler l’adresse mail avec laquelle vous avez reçu ce message ?'];
    const conseillers = reply['Combien de conseillers numériques souhaitez-vous accueillir ?'];

    if (/\d{14}/.test(siret)) {
      const siren = siret.substring(0,9);
      try {
        const infosEtablissement = await checkSiret(siret);
        // infosEtablissement.adresse
        const infosEntreprise = await checkSiren(siren);
        // infosEntreprise.entreprise.siret_siege_social
        // infosEntreprise.entreprise.raison_sociale
        console.log(`OK ${id} ${siret} ${infosEntreprise.entreprise.raison_sociale}`);

        await updateDB(email, infosEntreprise.entreprise, conseillers);
      } catch (error) {
        console.log(`KO ${id} ${siret} : ${error.message}`);
      }
    } else {
      console.log(`KO ${id} ${siret} : siret mauvais format`);
    }
  }
}).catch((error) => {console.log(error.message);});

