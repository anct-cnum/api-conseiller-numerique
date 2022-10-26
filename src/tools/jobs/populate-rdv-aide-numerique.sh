#!/bin/bash -l

cd ${APP_HOME}

echo "Mise à jour des urls RDV Aide Numérique : START\n"
node src/tools/populate/populate-rdv-aide-numerique/populate-rdv-aide-numerique.js
echo "Mise à jour des urls RDV Aide Numérique : END\n"

