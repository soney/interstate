#!/bin/sh
set -eu
cd "$(dirname "$0")"
: "${DEPLOY_TARGET:?Set DEPLOY_TARGET to the SSH destination, e.g. user@host:/var/www/interstate/}"
npm ci
npm test
scp -r .build/. "$DEPLOY_TARGET"
