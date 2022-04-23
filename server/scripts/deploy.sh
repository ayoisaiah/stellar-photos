#!/bin/bash

# exit when any command fails
set -e

echo "Pulling latest docker image"
docker pull ayoisaiah/stellar-photos-server:latest
docker container inspect stellar-photos-server > /dev/null 2>&1 || docker stop stellar-photos-server && docker rm -f stellar-photos-server
docker volume create cached_images
docker run --env-file .env -d -p 8080:8080 -v cached_images:/app/cached_images --name stellar-photos-server ayoisaiah/stellar-photos-server:latest
docker system prune -af
rm -f deploy.sh .env
echo "Finished deploying Docker image"
