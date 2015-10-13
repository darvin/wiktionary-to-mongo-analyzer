#!/bin/sh
set -e



BZIPPED_DUMP=./build/enWiktionaryDump.json.bz2
DUMP=./build/enWiktionaryDump.json
MONGO_DUMP=$CIRCLE_ARTIFACTS/enWiktionary.json.bz2

if [ ! -f $BZIPPED_DUMP ]; then
	mkdir ./build || true
	wget `./scripts/mongo_dump_circleci_latest_url.js` -P ./build
fi

bunzip2 $BZIPPED_DUMP

mongoimport  --db wiktionaryToMongo --collection enWiktionaryDump --drop --file  $DUMP

rm $DUMP


node --expose-gc ./scripts/analyze.js

mongoexport --db wiktionaryToMongo --collection enWiktionary |bzip2 > $MONGO_DUMP
