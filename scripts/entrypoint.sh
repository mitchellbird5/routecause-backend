#!/bin/sh
set -e

# Install dependencies if node_modules missing or package.json changed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.installed" ] || [ package.json -nt node_modules/.installed ]; then
    echo "Installing npm packages..."
    npm install

    # Optional: auto-install missing @types for TS
    if [ -f "package.json" ]; then
        npx typesync
    fi

    touch node_modules/.installed
fi

# Execute the container command
exec "$@"
