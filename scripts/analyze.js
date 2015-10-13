#!/usr/bin/env node


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var LOG_EVERY = 1;
var LIMIT = 8;
var path = require('path');

var ForkPool = require('fork-pool');


console.log("FOUND CPUS: ",require('os').cpus());
var numberWorkers  = 8;
var spinupTime = numberWorkers * 1000;
var Pool = new ForkPool(__dirname + '/analyze_worker.js', null, null, {size: numberWorkers, timeout: spinupTime*2});

setTimeout(function(){
  MongoClient.connect(url, function(err, db) {

    var col = db.collection('enWiktionaryDump');
    var colOutput = db.collection('enWiktionary');

      var cursor = col.find({}, {title:1, namespace:1}, {timeout:true});
      var index = 0;
      var indexSaved = 0;
      if (LIMIT);
        cursor = cursor.limit(LIMIT);
      cursor.count(function(err, total){
        console.time("total");

        var finishedSaving = function() {
          indexSaved++;
          if (indexSaved % LOG_EVERY==0) {
            console.log ("Analyzed: "+indexSaved+"/"+total);
          }
          if (indexSaved>=total) {
            console.timeEnd("total");
            console.log("FINISHED ANALYZING");
            Pool.drain(function (err) {
              process.exit(0);
            })
            process.exit(0);

            return true;
          }
          
        }

        var stopped = false;

        var analyzeNext = function() {
          // console.log("POOL: 1");
          var stop = function() {
            if (stopped)
              return;
            else {

              stopped = true;
              console.log("FINISHED READING");
              // db.close();
            }
          }
          if (stopped)
            return;
          cursor.nextObject(function(err, doc) {
            if (err)
              console.log("POOL: error ", err);
            index ++;

            if (!doc || index>total+1) {
              stop();
            } else {
              if (index % LOG_EVERY==0) {
                console.log ("Read: "+index+"/"+total + " (current: '"+doc.title+"' )");
              }

              // console.log(doc);
              var docStr = JSON.stringify(doc);
              var enqueue = function() {
                Pool.enqueue(docStr, function (err, res) {
                  if (!finishedSaving()) {
                    analyzeNext();
                  }
                  if (res.stdout=="next") {

                    
                  } else {
                    console.log("POOL: ERROR!");
                  }
                });
              }
              // console.log("POOL: enqueing");
              enqueue();

            }
          });
        }
        for (var i = 0; i <numberWorkers; i++) {
          setTimeout(analyzeNext, Math.random() * 70 + 10);
        };


      });

  });
}, spinupTime);
