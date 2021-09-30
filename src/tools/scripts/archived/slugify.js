#!/usr/bin/env node
'use strict';

require('dotenv').config();
const slugify = require('slugify');

const { execute } = require('../utils');

execute(__filename, async ({ logger, exit }) => {

  logger.info('Passage du slugify sur les noms de dossier et de pdf ');

  const arrayToConvert = [
    'Courriels',
    'Creer_et_gerer_mon_adresse_Protonmail_depuis_mon_ordinateur.pdf',
    'Créer_et_gerer_une_adresse_Gmail_depuis_mon_ordinateur.pdf',
    'Utiliser_le_service_de_messagerie_Gmail_depuis_mon_ordinateur.pdf',

    'Échanger avec ses proches',
    'comment-me-premunir-des-emails-frauduleux_2021-06-10_08-13-56.pdf',
    'partager-son-ecran-avec-jitsi-skype-et-google-meet_2021-06-10_08-03-22.pdf',

    'Emploi',
    'Contacter_mon_conseiller_pole_emploi_depuis_mon_ordinateur.pdf',
    'Envoyer_un_document_sur_mon_espace_personnel_pole_Emploi_depuis_mon_ordinateur (1).pdf',
    'estimer-mes-allocations-chomage-en-cas-de-perte-dactivite_2021-06-10_08-20-54.pdf',
    'Estimer_mes_allocations_chomage_en_cas_de_perte_d_activite_depuis_mon_ordinateur.pdf',
    'Faire_ma_premiere_demande_d_inscription_pole_emploi_depuis_mon_ordinateur.pdf',
    'M_actualiser_aupres_de_pole_emploi_depuis_mon_ordinateur2 (1)',
    'Me_connecter_a_mon_compte_Pole_Emploi.pdf',
    'Obtenir_une_attestation_pole_emploi_depuis_mon_ordinateur.pdf',

    'Démarches en ligne',
    'acceder-a-lespace-numerique-de-travail-dun-etablissement-scolaire_2021-06-10_07-53-26.pdf',
    'acheter-un-timbre-fiscal-en-ligne_2021-06-10_07-50-01.pdf',
    'creer-mon-identite-numerique-sur-le-site-de-la-poste_2021-06-10_11-52-10.pdf',
    'creer-son-compte-ants_2021-06-10_08-04-08.pdf',
    'creer-son-espace-particulier-sur-impots-gouv-fr_2021-06-10_08-08-32.pdf',
    'creer-un-compte-sur-un-site_2021-06-10_08-18-57.pdf',
    'declarer-ses-revenus-sur-le-site-des-impots_2021-06-10_08-14-53.pdf',
    '-obtenir-un-extrait-de-casier-judiciaire-en-ligne_2021-06-10_07-52-20.pdf',
    'partager-un-document-sur-doctolib_2021-06-10_08-16-04.pdf',
    'prendre-rendez-vous-pour-une-vaccination-covid-sur-doctolib_2021-06-10_08-13-09.pdf',
    'trouver-un-creneau-de-vaccination-sur-vite-ma-dose_2021-06-10_08-07-52.pdf',
    'verifier-le-rayon-de-10-km-autour-de-chez-moi_2021-06-10_08-20-23.pdf',
    'verifier-les-points-de-son-permis-de-conduire_2021-06-10_08-07-16.pdf',

    'Naviguer sur internet',

    'Installer et utiliser des apps utiles sur son smartphone',
    'Communiquer_par_la_messagerie_instantanee_Signal_avec_mon_Smartphone.pdf',
    'Communiquer_par_la_messagerie_instantanee_skype_avec_mon_smartphone.pdf',
    'Communiquer_par_messagerie_instantane%CC%81e_Snapchat_avec_mon_smartphone.pdf',
    'scanner-un-qr-code-avec-son-smartphone_2021-06-10_08-06-34.pdf',
    'Telecharger_et_installer_une_application_sur_mon_smartphone_ou_ma_tablette_Android.pdf',
    'Telecharger_et_installer_une_application_sur_mon_smartphone_ou_ma_tablette_iOS.pdf',
    'utiliser-mon-smartphone-android-comme-point-de-connexion-internet_2021-06-10_08-23-51.pdf',
    'utiliser-mon-smartphone-ios-comme-point-de-connexion-internet_2021-06-10_08-24-28.pdf',

    'Créer et gérer des contenus numériques',
    'acceder-aux-visites-virtuelles-de-lieux-culturels_2021-06-10_08-14-24.pdf',
    'envoyer-des-fichiers-avec-smash_2021-06-10_08-12-43.pdf',
    'envoyer-des-fichiers-avec-wetransfer_2021-06-10_08-10-49.pdf',
    'lire-des-livres-numeriques-ou-e-books_2021-06-10_08-04-49.pdf',

    'Prendre en main un équipement informatique',
    'creer-un-mot-de-passe-securise_2021-06-10_08-16-41.pdf',
    'Se_connercter_a_internet_depuis_son_ordinateur.pdf',

    'accompagner son enfant',
    'eduscol-pour-les-professeurs_2021-06-10_08-18-20.pdf',
    'reviser-avec-mon-enfant_2021-06-10_08-10-16.pdf',

    'traitement de texte',
    'installer-la-suite-bureautique-libreoffice_2021-06-10_08-15-34.pdf'
  ];

  arrayToConvert.forEach(line => {
    console.log(slugify(line));
  });

  exit();
});

/* RESULT

Courriels
Creer_et_gerer_mon_adresse_Protonmail_depuis_mon_ordinateur.pdf
Creer_et_gerer_une_adresse_Gmail_depuis_mon_ordinateur.pdf
Utiliser_le_service_de_messagerie_Gmail_depuis_mon_ordinateur.pdf


Echanger-avec-ses-proches
Comment-me-premunir-des-emails-frauduleux_2021-06-10_08-13-56.pdf
Partager-son-ecran-avec-jitsi-skype-et-google-meet_2021-06-10_08-03-22.pdf


Emploi
Contacter_mon_conseiller_pole_emploi_depuis_mon_ordinateur.pdf
Envoyer_un_document_sur_mon_espace_personnel_pole_Emploi_depuis_mon_ordinateur-(1).pdf
Estimer-mes-allocations-chomage-en-cas-de-perte-dactivite_2021-06-10_08-20-54.pdf
Estimer_mes_allocations_chomage_en_cas_de_perte_d_activite_depuis_mon_ordinateur.pdf
Faire_ma_premiere_demande_d_inscription_pole_emploi_depuis_mon_ordinateur.pdf
M_actualiser_aupres_de_pole_emploi_depuis_mon_ordinateur2-(1)
Me_connecter_a_mon_compte_Pole_Emploi.pdf
Obtenir_une_attestation_pole_emploi_depuis_mon_ordinateur.pdf


Demarches-en-ligne
acceder-a-lespace-numerique-de-travail-dun-etablissement-scolaire_2021-06-10_07-53-26.pdf
Acheter-un-timbre-fiscal-en-ligne_2021-06-10_07-50-01.pdf
creer-mon-identite-numerique-sur-le-site-de-la-poste_2021-06-10_11-52-10.pdf
creer-son-compte-ants_2021-06-10_08-04-08.pdf
creer-son-espace-particulier-sur-impots-gouv-fr_2021-06-10_08-08-32.pdf
creer-un-compte-sur-un-site_2021-06-10_08-18-57.pdf
declarer-ses-revenus-sur-le-site-des-impots_2021-06-10_08-14-53.pdf
-obtenir-un-extrait-de-casier-judiciaire-en-ligne_2021-06-10_07-52-20.pdf
partager-un-document-sur-doctolib_2021-06-10_08-16-04.pdf
prendre-rendez-vous-pour-une-vaccination-covid-sur-doctolib_2021-06-10_08-13-09.pdf
trouver-un-creneau-de-vaccination-sur-vite-ma-dose_2021-06-10_08-07-52.pdf
verifier-le-rayon-de-10-km-autour-de-chez-moi_2021-06-10_08-20-23.pdf
verifier-les-points-de-son-permis-de-conduire_2021-06-10_08-07-16.pdf


Naviguer-sur-internet

Installer-et-utiliser-des-apps-utiles-sur-son-smartphone
Communiquer_par_la_messagerie_instantanee_Signal_avec_mon_Smartphone.pdf
Communiquer_par_la_messagerie_instantanee_skype_avec_mon_smartphone.pdf
Communiquer_par_messagerie_instantanepercentCCpercent81e_Snapchat_avec_mon_smartphone.pdf
scanner-un-qr-code-avec-son-smartphone_2021-06-10_08-06-34.pdf
Telecharger_et_installer_une_application_sur_mon_smartphone_ou_ma_tablette_Android.pdf
Telecharger_et_installer_une_application_sur_mon_smartphone_ou_ma_tablette_iOS.pdf
utiliser-mon-smartphone-android-comme-point-de-connexion-internet_2021-06-10_08-23-51.pdf
utiliser-mon-smartphone-ios-comme-point-de-connexion-internet_2021-06-10_08-24-28.pdf


Creer-et-gerer-des-contenus-numeriques
acceder-aux-visites-virtuelles-de-lieux-culturels_2021-06-10_08-14-24.pdf
envoyer-des-fichiers-avec-smash_2021-06-10_08-12-43.pdf
envoyer-des-fichiers-avec-wetransfer_2021-06-10_08-10-49.pdf
lire-des-livres-numeriques-ou-e-books_2021-06-10_08-04-49.pdf


Prendre-en-main-un-equipement-informatique
creer-un-mot-de-passe-securise_2021-06-10_08-16-41.pdf
Se_connercter_a_internet_depuis_son_ordinateur.pdf


accompagner-son-enfant
eduscol-pour-les-professeurs_2021-06-10_08-18-20.pdf
reviser-avec-mon-enfant_2021-06-10_08-10-16.pdf


traitement-de-texte
installer-la-suite-bureautique-libreoffice_2021-06-10_08-15-34.pdf
*/
