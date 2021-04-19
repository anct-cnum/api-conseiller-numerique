#!/bin/bash -l

cd ${APP_HOME}

echo "Création des mises en relation : START\n"
node src/tools/admin/mise-en-relation.js
echo "Création des mises en relation : END\n"

