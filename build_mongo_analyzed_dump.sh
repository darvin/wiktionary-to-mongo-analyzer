#!/bin/sh

mkdir ./build

BZIPPED_DUMP=./build/enWiktionaryDump.json.bz2
DUMP=enWiktionaryDump.json
if [ ! -f $BZIPPED_DUMP ]; then
	wget `./scripts/mongo_dump_circleci_latest_url.js` -P ./build
fi

bunzip2 $BZIPPED_DUMP

mongoimport  --db wiktionaryToMongo $DUMP