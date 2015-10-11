#!/usr/bin/env node

var CircleCI = require('circleci');

function main(cb) {

var ci = new CircleCI({
  auth: process.env.CIRCLECI_API_TOKEN
});

var MONGO_DUMP_PROJECT_NAME = "wiktionary-to-mongo";
ci.getBuilds({ username: process.env.CIRCLE_USERNAME, project: MONGO_DUMP_PROJECT_NAME })
  .then(function(builds){
  	var latestBuildNum = builds[0].build_num;
	  ci.getBuildArtifacts({
		  username: process.env.CIRCLE_USERNAME,
		  project: MONGO_DUMP_PROJECT_NAME,
		  build_num: latestBuildNum
		}).then(function(artifacts){
		  artifacts.forEach(function(a) {
        if (a.pretty_path=="$CIRCLE_ARTIFACTS/enWiktionaryDump.json.bz2") {
          cb(null,a.url);
        }
      })
      cb(null, null);
		});

  });

}

if (require.main === module) {
  main(function(err, result) {
    if (result) {
      console.log(result);
      process.exit(0);
    } else {
      process.exit(404);   
    }
  });
}

module.exports = main;
