#!/bin/bash -l

cd ${APP_HOME}

echo "Suppression des Comptes candidats inactifs: START\n"
node src/tools/scripts/rgpd-suppression-compte.js
echo "Suppression des Comptes candidats inactifs: END\n"
