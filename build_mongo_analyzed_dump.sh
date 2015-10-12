#!/bin/sh
set -e



BZIPPED_DUMP=./build/enWiktionaryDump.json.bz2
DUMP=./build/enWiktionaryDump.json
if [ ! -f $BZIPPED_DUMP ]; then
	mkdir ./build || true
	wget `./scripts/mongo_dump_circleci_latest_url.js` -P ./build
fi

bunzip2 $BZIPPED_DUMP

mongoimport  --db wiktionaryToMongo --collection enWiktionaryDump --drop --file  $DUMP

rm $DUMP