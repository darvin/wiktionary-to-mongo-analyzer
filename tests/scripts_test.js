var assert = require("assert");

var circleci_latest_artifact= require('../scripts/mongo_dump_circleci_latest_url');
describe('Scripts', function() {
  describe('Latest Circle CI artifact URL', function () {
    it('should return something', function (done) {
    	circleci_latest_artifact(function(err, result){
    		      assert(result);
    		      done(err);
    	})
    });
  });
});
