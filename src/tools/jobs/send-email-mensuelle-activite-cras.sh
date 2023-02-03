#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to conseillers: START\n"
node src/tools/scripts/mailMensuelActivite/mailMensuelActivite.js --limit 100
echo "Sending email to conseillers: END\n"
