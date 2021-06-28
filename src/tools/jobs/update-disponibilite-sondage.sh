#!/bin/bash -l

cd ${APP_HOME}

echo "Updating disponible in Postgres: START\n"
node src/tools/scripts/updateDisponibiliteCandidat.js
echo "Updating disponible in Postgres: END\n"
