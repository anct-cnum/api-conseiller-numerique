#!/bin/bash -l

cd ${APP_HOME}

echo "Suppression des Comptes inactifs: START\n"
node src/tools/scripts/suppressionInactifsComptes.js
echo "Suppression des Comptes inactifs: END\n"
