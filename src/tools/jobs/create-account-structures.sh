#!/bin/bash -l

cd ${APP_HOME}

echo "Creating structures' accounts : START\n"
node src/tools/admin/structures/users --all --limit 100
echo "Creating structures' accounts : END\n"
