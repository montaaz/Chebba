#!/usr/bin/env bash
# Update the self-hosted site to the latest code on GitHub (main).
# Run on the server as the chebba user:
#   sudo -u chebba -H /var/www/chebba/scripts/deploy-server.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
npm ci --no-audit --no-fund
npm run db:migrate                                  # applies new db/migrations/*.sql, if any
npm run db:seed                                     # first-run data only; never overwrites
NODE_OPTIONS=--max-old-space-size=1536 npm run build # the server has 2 GB of memory
pm2 reload chebba --update-env
pm2 save
echo "Chebba Auto Car is up to date: $(git log --oneline -1)"
