#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to candidats: START\n"
node src/tools/admin/candidats/account --limit 100
echo "Sending email to candidats: END\n"
