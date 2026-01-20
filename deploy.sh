#!/bin/bash

set -e

# Load environment variables from .env.deploy
if [ -f .env.deploy ]; then
    export $(grep -v '^#' .env.deploy | xargs)
else
    echo "Error: .env.deploy file not found"
    exit 1
fi

# Validate required variables
if [ -z "$DEPLOY_SERVER" ] || [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_PASSWORD" ] || [ -z "$DEPLOY_PATH" ]; then
    echo "Error: Missing required environment variables in .env.deploy"
    echo "Required: DEPLOY_SERVER, DEPLOY_USER, DEPLOY_PASSWORD, DEPLOY_PATH"
    exit 1
fi

echo "Building project..."
yarn build

if [ ! -d "dist" ]; then
    echo "Error: dist folder not found after build"
    exit 1
fi

echo "Uploading to $DEPLOY_SERVER$DEPLOY_PATH..."

lftp -u "$DEPLOY_USER","$DEPLOY_PASSWORD" "$DEPLOY_SERVER" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow yes
set ftp:ssl-force yes
set ftp:passive-mode yes
set net:timeout 30
set net:max-retries 3
set mirror:parallel-transfer-count 4
mirror --reverse --delete --verbose --exclude .DS_Store --only-newer dist/ $DEPLOY_PATH
bye
EOF

echo "Deploy complete!"
