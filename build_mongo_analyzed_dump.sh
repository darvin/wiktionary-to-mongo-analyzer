#!/bin/sh

mkdir ./build

wget `./scripts/mongo_dump_circleci_latest_url.js` -P ./build
