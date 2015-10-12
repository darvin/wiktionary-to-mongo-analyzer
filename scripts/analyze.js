#!/usr/bin/env node


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var LOG_EVERY = 1;
var LIMIT = 50;
var path = require('path');

var Worker = require('webworker-threads').Worker;

var outputWorker = new Worker(path.join(__dirname, "analyze_worker.js"));
/*
var outputWorker = new Worker(function() {
      this.onmessage = function (event) {
        var doc = JSON.parse(event.data);
        console.log("received", doc);
          postMessage("next");
      }
});
*/


console.log("FOUND CPUS: ",require('os').cpus().length);
MongoClient.connect(url, function(err, db) {

  var col = db.collection('enWiktionaryDump');
  var colOutput = db.collection('enWiktionary');

    var cursor = col.find({});
    var index = 0;
    var indexSaved = 0;
    cursor.count(function(err, total){
      console.time("total");

      

      var analyzeNext = function(worker) {
        var stopped = false;
        var stop = function() {
          if (stopped)
            return;
          else {
            console.log("FINISHED READING");

            stopped = true;
            db.close();
          }
        }
        cursor.nextObject(function(err, doc) {
          if (err)
            console.error(err);
          if (!doc || (LIMIT && index>=LIMIT)) {
            stop();
          } else {
            index ++;
            if (index % LOG_EVERY==0) {
              console.log ("Read: "+index+"/"+total + " (current: '"+doc.title+"' )");
            }
            // console.log(doc);
            outputWorker.postMessage(JSON.stringify(doc));


          }
        });
      }
      outputWorker.onmessage = function (event) {
        if (event.data=="next")
          analyzeNext(outputWorker);
      };
      analyzeNext(outputWorker);

    });

});
