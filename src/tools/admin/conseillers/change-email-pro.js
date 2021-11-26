const { program } = require('commander');
const { execute } = require('../../utils');
const { deleteMailbox, createMailbox } = require('../../../utils/mailbox');
const slugify = require('slugify');

execute(__filename, async ({ db, logger, Sentry, exit, gandi }) => {

  program.option('-n, --nom <nom>', 'nom: nouveau nom');
  program.option('-p, --prenom <prenom>', 'prenom: nouveau prenom');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-p, --password <password>', 'password du conseiller');
  program.option('-s, --supprimer', 'supprimer: le mailbox @conseiller-numerique.fr');
  program.option('-s, --creation', 'creation: creer un nouveau mailbox @conseiller-numerique.fr');
  program.helpOption('-h', 'HELP command');
  program.parse(process.argv);

  const id = ~~program.id;
  const supprimer = program.supprimer;
  const creation = program.creation;
  const password = program.password;
  let nom = program.nom;
  let prenom = program.prenom;
  let login;
  // prenom.nom
  if (id === 0 || (supprimer ^ creation)) {
    exit('Paramètres invalides. Veuillez préciser un id et un autre parametre sois supprimer ou creation');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  const conseillerId = conseiller._id;

  if (conseiller === null) {
    exit('idPG inconnu, conseiller non trouvé');
    return;
  }
  if (creation) {
    // complexité exgiger pour le password lors de la création de la boite mail
    const checkComplexity = new RegExp(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,199})/);
    if (!login || !password || !checkComplexity.test(password)) {
      exit('veuillez définir un login et un password avec au moins 8 caractères, 1 majuscules, 1 minuscule et un caractère spéciale');
      return;
    }
  }

  const conseillerNom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
  const conseillerPrenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
  nom = slugify(`${nom}`, { replacement: '-', lower: true, strict: true });
  prenom = slugify(`${prenom}`, { replacement: '-', lower: true, strict: true });

  if (prenom && nom) {
    login = `${prenom}.${nom}`;
  } else if (prenom) {
    login = prenom + conseillerNom;
  } else if (nom) {
    login = conseillerPrenom + nom;
  }

  try {
    //GANDI
    if (supprimer) {
      console.log('je suis dans la suppression mailbox');
      login = conseiller.emailCN.address.substring(0, conseiller.emailCN.address.lastIndexOf('@'));
      if (conseiller.emailCN.address) {
        await deleteMailbox(gandi, conseillerId, login, db, logger, Sentry);
      }
    } else {
      console.log('Je ne suis PAS dans la suppression mailbox');
    }
    if (creation) {
      console.log('je suis dans la création mailbox');
      await createMailbox({ gandi, conseillerId, login, password, db, logger, Sentry });
    } else {
      console.log('Je ne suis PAS dans la création mailbox');
    }

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email professionnelle : ${conseiller.emailCN.address} changer par => ${login}@${gandi.domain} pour le conseiller avec l'id ${id}`);
  exit();
});
