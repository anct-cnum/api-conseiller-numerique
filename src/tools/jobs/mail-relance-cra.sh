#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to conseillers: START\n"
node src/tools/scripts/mailRelanceCnFS/envoiMailRelanceM+1,5.js --limit 30
node src/tools/scripts/mailRelanceCnFS/envoiMailRelanceM+1.js --limit 30
echo "Sending email to conseillers: END\n"
