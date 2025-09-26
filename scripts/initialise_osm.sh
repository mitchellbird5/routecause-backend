#!/bin/bash
set -e

# --- Configuration ---
PBF_URL="https://download.geofabrik.de/oceania/new-zealand-latest.osm.pbf"
PBF_NAME="new-zealand-latest.osm.pbf"
VOLUME_NAME="osm-new-zealand-data"
CONTAINER_NAME="nominatim-import-temp"
OSM_DATA_DIR="./osm-data"
NOMINATIM_IMAGE="mediagis/nominatim:5.1"

# --- Step 1: Check prerequisites ---
if ! command -v docker >/dev/null 2>&1; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose is not installed. Please install Docker Compose first."
  exit 1
fi

# --- Step 2: Ensure local data folder exists ---
mkdir -p "$OSM_DATA_DIR"

# --- Step 3: Download OSM PBF safely ---
if [ -f "$OSM_DATA_DIR/$PBF_NAME" ]; then
    echo "OSM PBF already exists: $OSM_DATA_DIR/$PBF_NAME"
    read -p "Do you want to re-download it? [y/N]: " answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo "Downloading New Zealand OSM file..."
        curl -L "$PBF_URL" -o "$OSM_DATA_DIR/$PBF_NAME"
    else
        echo "Using existing PBF file."
    fi
else
    echo "Downloading New Zealand OSM file..."
    curl -L "$PBF_URL" -o "$OSM_DATA_DIR/$PBF_NAME"
fi

# --- Step 4: Ensure Docker volume exists safely ---
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo "Docker volume '$VOLUME_NAME' already exists."
    read -p "Do you want to reuse it? (recommended) [Y/n]: " answer
    if [[ "$answer" =~ ^[Nn]$ ]]; then
        echo "Exiting to avoid overwriting existing volume."
        exit 1
    fi
else
    echo "Creating Docker volume: $VOLUME_NAME"
    docker volume create "$VOLUME_NAME"
fi

# --- Step 5: Run import in a temporary container ---
echo "Starting temporary Nominatim container to import data..."
docker run --rm --name "$CONTAINER_NAME" \
    -e PBF_PATH="/data/$PBF_NAME" \
    -v "$VOLUME_NAME":/var/lib/postgresql/16/main \
    -v "$(pwd)/$OSM_DATA_DIR":/data \
    "$NOMINATIM_IMAGE" setup

# --- Step 6: Copy PBF into the volume for Compose ---
echo "Ensuring PBF exists in volume at /var/lib/postgresql/16/main..."
docker run --rm \
  -v "$VOLUME_NAME":/var/lib/postgresql/16/main \
  -v "$(pwd)/$OSM_DATA_DIR":/data \
  alpine sh -c "if [ ! -f /var/lib/postgresql/16/main/$PBF_NAME ]; then cp /data/$PBF_NAME /var/lib/postgresql/16/main/; fi"

# --- Step 7: Finished ---
echo "All setup complete!"
echo "You can now start your application stack with:"
echo "  docker-compose up"
