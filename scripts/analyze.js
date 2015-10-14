#!/usr/bin/env node


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var LOG_EVERY = 100;
var LIMIT = null;
var path = require('path');
var fs = require('fs');
// var lineStream = require('line-stream');
 
var forkfriend = require('forkfriend');
 



console.log("FOUND CPUS: ",require('os').cpus());
var numberWorkers  = require('os').cpus().length;
var MAXQUEUE =numberWorkers;

var manager = forkfriend({
  respawnInterval:300,
  maxQueue:numberWorkers * 2
});
var spinupTime = numberWorkers * 500;
manager.add(path.join(__dirname, 'analyze_worker.js'),numberWorkers);


setTimeout(function(){
  MongoClient.connect(url, function(err, db) {

    var col = db.collection('enWiktionaryDump');
    var colOutput = db.collection('enWiktionary');

      var cursor = col.find({}, {title:1, namespace:1}, {timeout:true});
      var index = 0;
      var indexSaved = 0;
      if (LIMIT)
        cursor = cursor.limit(LIMIT);
      cursor.count(function(err, total){
        console.time("total");

        var inputStream = cursor.stream();
        var inputStreamPlayPause = function() {
          if (index - indexSaved<MAXQUEUE) 
            inputStream.resume();
          else 
            inputStream.pause();
        }
        manager.pipe(process.stdout);
        inputStream.on('data', function(chunk) {
          manager.write(chunk);
          index++
          inputStreamPlayPause(); 
          if (index % LOG_EVERY==0) {
            console.log("READ: "+index+'/'+total);
          }
        });

        inputStream.on('end', function() {
          // console.log('there will be no more data.');
          // db.close();
          console.log("READ finished");
        });

        manager.on('data', function() {
          indexSaved++
          inputStreamPlayPause(); 

          if (indexSaved % LOG_EVERY==0) {
            console.log("ANALYZED: "+indexSaved+'/'+total);
          }
          if (indexSaved>=total) {
            console.log("EXIT");
            console.timeEnd("total");

            db.close(function(err) {
              manager.stop();
            });
          }
        });
        // manager.removeAllListeners('drain');
        manager.removeAllListeners('end');


      });

  });
}, spinupTime);
