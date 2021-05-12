#!/bin/bash -l

cd ${APP_HOME}

echo "Migration Postgresql vers MongoDB : START\n"
node src/tools/migration/migrate-pg-to-mongo.js -l 100000
echo "Migration Postgresql vers MongoDB : END\n"

