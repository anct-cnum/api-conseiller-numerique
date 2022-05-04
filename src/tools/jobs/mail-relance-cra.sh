#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to conseillers: START\n"
node src/tools/scripts/mailRelanceCnFS/envoiMailRelanceM+1,5.js --limit 100
node src/tools/scripts/mailRelanceCnFS/envoiMailRelanceM+1.js --limit 100
echo "Sending email to conseillers: END\n"
