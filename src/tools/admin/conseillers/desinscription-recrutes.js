const { deleteMailbox } = require('../../../utils/mailbox');
const { deleteAccount } = require('../../../utils/mattermost');
const dayjs = require('dayjs');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const pool = new Pool();

const configPG = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  db: process.env.PGDATABASE,
  port: process.env.PGPORT,
  sslMode: process.env.PGSSLMODE,
  host: process.env.PGHOST
};

program
.option('-c, --csv <path>', 'CSV file path')
.option('-l, --ligne <ligne>', 'ligne: lire à partir de telle ligne. Exemple, pour commencer à partir de ligne 88, il faut indiquer 86')
.option('-v, --verif', 'verif: vérification si doublons de ligne sans traitement');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    let users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    users = users.slice(~~program.ligne ?? 0);
    return users;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, emails, Sentry, gandi, mattermost }) => {

  if (Object.values(configPG).includes(undefined)) {
    logger.warn(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
    return exit();
  }

  const updateConseillersPG = async (email, disponible) => {
    try {
      await pool.query(`
        UPDATE djapp_coach
        SET disponible = $2
        WHERE LOWER(email) = LOWER($1)`,
      [email, disponible]);
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error.message);
    }
  };

  const formatDateDb = date => {
    return dayjs(date, 'YYYY-MM-DD').toDate();
  };

  const verificationDoublonFichier = conseillers => {
    // verification si le fichier contient des doublons de ligne (même conseiller)
    const arrayIds = conseillers.map(conseiller => parseInt(conseiller['ID du CNFS']) + ' & ' + parseInt(conseiller['ID de la structure']));
    const arrFichierAvecDoublon = [...new Set(arrayIds)];
    let idDoublon = [...arrayIds];
    arrFichierAvecDoublon.forEach(item => {
      const i = idDoublon.indexOf(item);
      idDoublon = idDoublon
      .slice(0, i)
      .concat(idDoublon.slice(i + 1, idDoublon.length));
    });
    return idDoublon;
  };

  logger.info('[DESINSCRIPTION COOP] Traitement des ruptures de contrat');
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async conseillers => {
      const arrayDoublon = await verificationDoublonFichier(conseillers);
      if (program.verif || arrayDoublon.length > 0) {
        // eslint-disable-next-line max-len
        exit(`Le fichier comporte ${arrayDoublon.length} doublon(s). ${arrayDoublon.length > 0 ? ` Et concerne(nt) le(s) couple(s) Id conseiller & Id structure => [${arrayDoublon}]` : ''}`);
        return;
      }
      const total = conseillers.length;
      let count = 0;
      let ok = 0;
      let errors = 0;
      const messageStructure = emails.getEmailMessageByTemplateName('conseillerRuptureStructure');
      const messagePix = emails.getEmailMessageByTemplateName('conseillersRupturePix');
      let conseillerslistPix = [];
      if (total === 0) {
        logger.info(`[DESINSCRIPTION COOP] Aucun conseiller dans le fichier fourni`);
      }
      conseillers.forEach(conseiller => {
        let p = new Promise(async (resolve, reject) => {
          const conseillerId = parseInt(conseiller['ID du CNFS']);
          const structureId = parseInt(conseiller['ID de la structure']);
          const dateRupture = conseiller['Date de démission'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const regexDateRupture = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
          const structure = await db.collection('structures').findOne({ idPG: structureId });
          const conseillerCoop = await db.collection('conseillers').findOne({
            idPG: conseillerId,
            statut: 'RECRUTE',
            estRecrute: true,
            structureId: structure?._id
          });
          const miseEnRelation = await db.collection('misesEnRelation').findOne({
            'conseiller.$id': conseillerCoop?._id,
            'structure.$id': conseillerCoop?.structureId,
            'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
          });
          const userCoop = await db.collection('users').findOne({
            'roles': { $in: ['conseiller'] },
            'entity.$id': conseillerCoop?._id
          });
          const login = conseillerCoop?.emailCN?.address?.substring(0, conseillerCoop.emailCN?.address?.lastIndexOf('@'));
          if (conseillerCoop === null) {
            logger.error(`Aucun conseiller recruté entre la structure id ${structureId} et le conseiller id ${conseillerId}`);
            errors++;
            reject();
          } else if (miseEnRelation === null) {
            logger.error(`Aucune mise en relation finalisée entre la structure id ${structureId} et le conseiller id ${conseillerId}`);
            errors++;
            reject();
          } else if (!regexDateRupture.test(conseiller['Date de démission'])) {
            // eslint-disable-next-line max-len
            logger.warn(`Format date rupture invalide : attendu DD/MM/YYYY pour le conseiller id ${conseillerId}`);
            errors++;
            reject();
          } else if (formatDateDb(dateRupture) > new Date()) {
            // eslint-disable-next-line max-len
            logger.warn(`RUPTURE en STAND BY en raison d'un anti-daté => Date de rupture ${conseiller['Date de démission']} pour le CnFS ${conseiller['Mail du CNFS']} (${conseillerId})`);
            errors++;
            reject();
          } else if (conseiller['Motif de la sortie du dispositif (QCM)'] === '') {
            logger.warn(`Motif de sortie non renseigné pour le conseiller id ${conseillerId}`);
            errors++;
            reject();
          } else {
            const motifRupture = conseiller['Motif de la sortie du dispositif (QCM)'];

            //Maj PG en premier lieu pour éviter la resynchro PG > Mongo (avec email pour tous les doublons potentiels)
            await updateConseillersPG(conseillerCoop.email, true);

            try {
              //Historisation de la rupture
              await db.collection('conseillersRuptures').insertOne({
                conseillerId: conseillerCoop._id,
                structureId: conseillerCoop.structureId,
                dateRupture: formatDateDb(dateRupture),
                motifRupture
              });

              //Mise à jour du conseiller
              await db.collection('conseillers').updateOne({ _id: conseillerCoop._id }, {
                $set: {
                  disponible: true,
                  statut: 'RUPTURE'
                },
                $push: { ruptures: {
                  structureId: structure._id,
                  dateRupture: formatDateDb(dateRupture),
                  motifRupture
                } },
                $unset: {
                  estRecrute: '',
                  structureId: '',
                  emailCNError: '',
                  emailCN: '',
                  mattermost: '',
                  resetPasswordCNError: '',
                  codeRegionStructure: '',
                  codeDepartementStructure: '',
                  hasPermanence: '',
                  telephonePro: '',
                  emailPro: '',
                  supHierarchique: ''
                }
              });

              //Suppression dans la liste d'un coordinateur si présent
              await db.collection('conseillers').updateMany(
                {
                  'estCoordinateur': true,
                  'statut': 'RECRUTE',
                  'listeSubordonnes.type': 'conseillers',
                  'listeSubordonnes.liste': { $elemMatch: { $eq: conseillerCoop._id } }
                },
                {
                  $pull: {
                    'listeSubordonnes.liste': conseillerCoop._id
                  }
                }
              );

              await db.collection('permanences').updateMany(
                {
                  $or: [
                    { 'conseillers': { $elemMatch: { $eq: conseillerCoop._id } } },
                    { 'conseillersItinerants': { $elemMatch: { $eq: conseillerCoop._id } } },
                    { 'lieuPrincipalPour': { $elemMatch: { $eq: conseillerCoop._id } } }
                  ]
                },
                { $pull: { conseillers: conseillerCoop._id, conseillersItinerants: conseillerCoop._id, lieuPrincipalPour: conseillerCoop._id } }
              );

              const conseillerUpdated = await db.collection('conseillers').findOne({ _id: conseillerCoop._id });

              //Mise à jour de la mise en relation avec la structure en rupture
              await db.collection('misesEnRelation').updateOne(
                { 'conseiller.$id': conseillerCoop._id,
                  'structure.$id': conseillerCoop.structureId,
                  'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
                },
                {
                  $set: {
                    statut: 'finalisee_rupture',
                    dateRupture: formatDateDb(dateRupture),
                    motifRupture,
                    conseillerObj: conseillerUpdated
                  }
                }
              );

              //Mise à jour des autres mises en relation en candidature nouvelle
              await db.collection('misesEnRelation').updateMany(
                { 'conseiller.$id': conseillerCoop._id,
                  'statut': 'finalisee_non_disponible'
                },
                {
                  $set: {
                    statut: 'nouvelle',
                    conseillerObj: conseillerUpdated
                  }
                }
              );

              //Modification des doublons potentiels
              await db.collection('conseillers').updateMany(
                {
                  _id: { $ne: conseillerCoop._id },
                  email: conseillerCoop.email
                },
                {
                  $set: {
                    disponible: true,
                  }
                }
              );
              await db.collection('misesEnRelation').updateMany(
                { 'conseiller.$id': { $ne: conseillerCoop._id },
                  'statut': 'finalisee_non_disponible',
                  'conseillerObj.email': conseillerCoop.email
                },
                {
                  $set: {
                    'statut': 'nouvelle',
                    'conseillerObj.disponible': true
                  }
                }
              );

              //Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
              const userCandidatAlreadyPresent = await db.collection('users').findOne({
                'roles': { $in: ['candidat'] },
                'name': conseillerCoop.email
              });
              if (userCandidatAlreadyPresent !== null) {
                await db.collection('users').deleteOne({ _id: userCoop._id });
                await db.collection('conseillers').updateOne({ _id: conseillerCoop._id }, {
                  $set: {
                    userCreated: false
                  }
                });
                await db.collection('misesEnRelation').updateMany(
                  { 'conseiller.$id': conseillerCoop._id },
                  { $set: {
                    'conseillerObj.userCreated': false
                  } }
                );
              }

              //Passage en compte candidat avec email perso
              let userToUpdate = {
                name: conseillerCoop.email,
                roles: ['candidat'],
                token: uuidv4(),
                tokenCreatedAt: new Date(),
                mailSentDate: null, //pour le mécanisme de relance d'invitation candidat
                passwordCreated: false,
              };
              if (userCoop !== null && userCandidatAlreadyPresent === null) {
                //Maj name si le compte coop a été activé
                if (conseillerCoop.email !== userCoop.name) {
                  await db.collection('users').updateOne({ _id: userCoop._id }, {
                    $set: { ...userToUpdate }
                  });
                } else {
                  const { name: _, ...userWithoutName } = userToUpdate; //nécessaire pour ne pas avoir d'erreur de duplicate key
                  await db.collection('users').updateOne({ _id: userCoop._id }, {
                    $set: { ...userWithoutName }
                  });
                }
              }

              //Suppression compte Gandi
              if (login !== undefined) {
                await deleteMailbox(gandi, db, logger, Sentry)(conseillerCoop._id, login);
              }
              //Suppression compte Mattermost
              if (conseillerCoop.mattermost?.id !== undefined) {
                await deleteAccount(mattermost, conseillerCoop, db, logger, Sentry);
              }

              //Envoi du mail d'information à la structure
              if (conseillerslistPix.find(conseiller => conseiller['Structure id'] === conseillerCoop.structureId) === undefined) {
                await messageStructure.send(miseEnRelation, structure.contact.email);
              }

              conseillerslistPix.push({
                'Prénom': conseillerCoop.prenom,
                'Nom': conseillerCoop.nom,
                'Email personnel': conseillerCoop.email,
                'Email professionnel': conseillerCoop?.emailCN?.address ?? 'Non défini',
                'Structure id': conseillerCoop.structureId //pour éviter d'envoyer le mail plusieurs fois à la même structure
              });
            } catch (error) {
              logger.error(error.message);
              Sentry.captureException(error);
            }
            logger.info('conseiller traité en rupture : ' + conseillerId);
            ok++;
          }
          count++;
          if (total === count) {
            //Envoi du mail global à PIX
            if (conseillerslistPix.length > 0) {
              await messagePix.send(conseillerslistPix);
            }
            logger.info(`[DESINSCRIPTION COOP] Des conseillers ont été désinscrits :  ` +
                `${ok} désinscrit(s) / ${errors} erreur(s)`);
            exit();
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
  exit();
});
