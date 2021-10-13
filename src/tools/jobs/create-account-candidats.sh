#!/bin/bash -l

cd ${APP_HOME}

echo "Creating candidats' accounts : START\n"
node src/tools/admin/candidats/users --all --limit 100
echo "Creating candidats' accounts : END\n"
