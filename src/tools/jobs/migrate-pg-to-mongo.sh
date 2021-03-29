#!/bin/bash -l

cd ${APP_HOME}

DATECOURANTE=`date +"%Y-%m-%d-%H-%M"`

echo "Migration Postgresql vers MongoDB : START\n"
node src/tools/scripts/migrate-pg-to-mongo.js -l 100000 > ${APP_HOME}/batchlogs/migrate-pg-to-mongo-${DATECOURANTE}.txt
gzip -9 ${APP_HOME}/batchlogs/migrate-pg-to-mongo-${DATECOURANTE}.txt
echo "Migration Postgresql vers MongoDB : END\n"

DATECOURANTE=`date +"%Y-%m-%d-%H-%M"`

echo "Création des mises en relation : START\n"
node src/tools/admin/mise-en-relation.js > ${APP_HOME}/batchlogs/mise-en-relation-${DATECOURANTE}.txt
gzip -9 ${APP_HOME}/batchlogs/mise-en-relation-${DATECOURANTE}.txt
echo "Création des mises en relation : END\n"

