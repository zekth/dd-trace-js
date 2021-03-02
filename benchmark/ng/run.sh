#!/usr/bin/env bash

export GIT_COMMIT_HASH=$(git rev-parse HEAD)
yaml=docker-compose-$1.yml
node generate $1 > $yaml
echo "wrote yaml to $yaml"
docker-compose -f $yaml up --build --abort-on-container-exit
docker-compose -f $yaml rm -f
