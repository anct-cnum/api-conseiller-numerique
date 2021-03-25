#!/bin/bash -l

cd ${APP_HOME}

echo "Migration Postgresql vers MongoDB : START\n"
node src/tools/scripts/migrate-pg-to-mongo.js -l 100000
echo "Migration Postgresql vers MongoDB : END\n"
echo "Création des mises en relation : START\n"
node src/tools/admin/mise-en-relation.js
echo "Création des mises en relation : END\n"

