#!/bin/sh
set -e

# Always ensure all dependencies exist
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.installed" ] || [ package.json -nt node_modules/.installed ]; then
    echo "Installing npm packages..."
    npm install --include=dev --force

    # Optional: auto-install missing @types for TypeScript
    if [ -f "package.json" ]; then
        npx typesync || true
    fi

    touch node_modules/.installed
fi

# Execute the container command
exec "$@"
