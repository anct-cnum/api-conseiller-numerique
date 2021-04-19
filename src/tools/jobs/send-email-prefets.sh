#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to prefets: START\n"
node src/tools/admin/prefets/account --limit 100
echo "Sending email to prefets: END\n"
