#!/bin/sh
set -e

# Always install missing packages (including devDependencies)
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.installed" ] || [ package.json -nt node_modules/.installed ]; then
    echo "Installing npm packages..."
    npm ci --include=dev

    # Optional: auto-install missing @types for TS
    if [ -f "package.json" ]; then
        npx typesync || true
    fi

    touch node_modules/.installed
fi

# Execute the container command
exec "$@"
