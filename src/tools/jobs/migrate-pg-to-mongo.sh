#!/bin/bash -l

cd ${APP_HOME}

DATECOURANTE=`date +"%Y-%m-%d-%H-%M"`

echo "Migration Postgresql vers MongoDB : START\n"
node src/tools/scripts/migrate-pg-to-mongo.js -l 100000 > ${APP_HOME}/batchlogs/migrate-pg-to-mongo-${CURRENTDATE}.txt
echo "Migration Postgresql vers MongoDB : END\n"
echo "Création des mises en relation : START\n"
node src/tools/admin/mise-en-relation.js > ${APP_HOME}/batchlogs/mise-en-relation-${CURRENTDATE}.txt
echo "Création des mises en relation : END\n"

