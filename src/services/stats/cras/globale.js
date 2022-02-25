const dayjs = require('dayjs');
const { sortByValueThenName } = require('../export-statistiques/utils/export-statistiques.utils');

const getStatsGlobales = async (db, query, statsCras, isAdminCoop) => {

  let statsGlobales = {};
  //Nombre total d'accompagnements
  statsGlobales.nbAccompagnement = await statsCras.getNombreCra(db)(query);

  //Nombre total atelier collectif + accompagnement individuel + demande ponctuel + somme total des participants (utile pour atelier collectif)
  let statsActivites = await statsCras.getStatsActivites(db, query);
  statsGlobales.nbAteliers = statsActivites?.find(activite => activite._id === 'collectif')?.count ?? 0;
  statsGlobales.nbTotalParticipant = statsActivites?.find(activite => activite._id === 'collectif')?.nbParticipants ?? 0;
  statsGlobales.nbAccompagnementPerso = statsActivites?.find(activite => activite._id === 'individuel')?.count ?? 0;
  statsGlobales.nbDemandePonctuel = statsActivites?.find(activite => activite._id === 'ponctuel')?.count ?? 0;

  //Nombre de participants récurrents
  const statsRecurrence = await statsCras.getPersonnesRecurrentes(db, query);
  statsGlobales.nbParticipantsRecurrents = statsRecurrence[0]?.count ?? 0;

  //Accompagnement poursuivi en individuel + en aterlier collectif + redirigé
  let statsAccompagnements = await statsCras.getStatsAccompagnements(db, query);
  statsGlobales.nbUsagersAccompagnementIndividuel = statsAccompagnements[0]?.individuel ?? 0;
  statsGlobales.nbUsagersAtelierCollectif = statsAccompagnements[0]?.atelier ?? 0;
  statsGlobales.nbReconduction = statsAccompagnements[0]?.redirection ?? 0;

  //Total accompagnés
  statsGlobales.nbUsagersBeneficiantSuivi = statsGlobales.nbUsagersAccompagnementIndividuel +
  statsGlobales.nbUsagersAtelierCollectif + statsGlobales.nbReconduction;

  let totalParticipants = await statsCras.getStatsTotalParticipants(statsGlobales);

  //Taux accompagnement
  statsGlobales.tauxTotalUsagersAccompagnes = await statsCras.getStatsTauxAccompagnements(statsGlobales, totalParticipants);

  //Thèmes (total de chaque catégorie)
  statsGlobales.statsThemes = await statsCras.getStatsThemes(db, query);
  statsGlobales.statsThemes = isAdminCoop ? statsGlobales.statsThemes.sort(sortByValueThenName) : statsGlobales.statsThemes;

  //Canaux (total de chaque catégorie)
  statsGlobales.statsLieux = await statsCras.getStatsCanaux(db, query);
  if (isAdminCoop === true) {
    //Conversion en %
    statsGlobales.statsLieux = statsGlobales.statsLieux.map(lieu => {
      lieu.valeur = statsGlobales.nbAccompagnement > 0 ? Math.round(lieu.valeur / statsGlobales.nbAccompagnement * 100) : 0;
      return lieu;
    });
  }

  //Duree (total de chaque catégorie)
  statsGlobales.statsDurees = await statsCras.getStatsDurees(db, query);

  //Catégorie d'âges (total de chaque catégorie en %)
  statsGlobales.statsAges = await statsCras.getStatsAges(db, query, totalParticipants);

  //Statut des usagers (total de chaque catégorie en %)
  statsGlobales.statsUsagers = await statsCras.getStatsStatuts(db, query, totalParticipants);

  //Lieux de Réorientation (total de chaque catégorie en %)
  statsGlobales.statsReorientations = await statsCras.getStatsReorientations(db, query, statsGlobales.nbReconduction);

  //Evolutions du nb de cras sur les 4 derniers mois.
  let aggregateEvol = [];
  const dateFinEvo = new Date();
  let dateDebutEvo = new Date(dayjs(new Date()).subtract(4, 'month'));

  const dateDebutEvoYear = dateDebutEvo.getFullYear();
  const dateFinEvoYear = dateFinEvo.getFullYear();

  aggregateEvol = await db.collection('stats_conseillers_cras').aggregate(
    { $unwind: '$' + dateFinEvoYear },
    { $group: { '_id': '$' + dateFinEvoYear + '.mois',
      'totalCras': { $sum: '$' + dateFinEvoYear + '.totalCras' } },
    },
    {
      $addFields: { 'mois': '$_id', 'annee': dateFinEvoYear }
    },
    { $project: { mois: '$_id' } }
  ).toArray();

  statsGlobales.statsEvolutions = JSON.parse('{"' + dateFinEvoYear.toString() + '":' + JSON.stringify(aggregateEvol) + '}');

  // Si année glissante on récupère les données de l'année n-1
  if (dateDebutEvoYear !== dateFinEvoYear) {

    const aggregateEvolLastYear = await db.collection('stats_conseillers_cras').aggregate(
      { $unwind: '$' + dateDebutEvoYear },
      { $group: { '_id': '$' + dateDebutEvoYear + '.mois',
        'totalCras': { $sum: '$' + dateDebutEvoYear + '.totalCras' } },
      },
      {
        $addFields: { 'mois': '$_id', 'annee': dateDebutEvoYear }
      },
      { $project: { mois: '$_id' } }
    ).toArray();

    statsGlobales.statsEvolutions = JSON.parse('{"' +
    dateDebutEvoYear.toString() + '":' + JSON.stringify(aggregateEvolLastYear) + ',"' +
    dateFinEvoYear.toString() + '":' + JSON.stringify(aggregateEvol) + '}');
  }


  return statsGlobales;

};

module.exports = { getStatsGlobales };
