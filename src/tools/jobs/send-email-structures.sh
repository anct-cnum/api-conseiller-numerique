#!/bin/bash -l

cd ${APP_HOME}

echo "Sending email to structures: START\n"
node src/tools/admin/structures/account --limit 100
echo "Sending email to structures: END\n"
