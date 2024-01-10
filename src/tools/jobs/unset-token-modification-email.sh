#!/bin/bash -l

cd ${APP_HOME}

echo "Rénitialisation du token mail à confirmer: START\n"
node src/tools/scripts/desactivationTokenChangeMail.js
echo "Rénitialisation du token mail à confirmer: END\n"
