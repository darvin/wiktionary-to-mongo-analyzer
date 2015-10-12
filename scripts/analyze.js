#!/usr/bin/env node


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var LOG_EVERY = 1;
var LIMIT = 50;
var path = require('path');

var ForkPool = require('fork-pool');

var numberWorkers  = require('os').cpus().length;

console.log("FOUND CPUS: ",numberWorkers);

var Pool = new ForkPool(__dirname + '/analyze_worker.js', null, null, {size: numberWorkers});

setTimeout(function(){
  MongoClient.connect(url, function(err, db) {

    var col = db.collection('enWiktionaryDump');
    var colOutput = db.collection('enWiktionary');

      var cursor = col.find({});
      var index = 0;
      var indexSaved = 0;
      cursor.count(function(err, total){
        console.time("total");

        var finishedSaving = function() {
          indexSaved++;
          if (indexSaved>=LIMIT) {
            console.timeEnd("total");
            console.log("FINISHED ANALYZING");
            return true;
          }
          if (indexSaved % LOG_EVERY==0) {
            console.log ("Analyzed: "+indexSaved+"/"+total);
          }
        }

        var analyzeNext = function() {
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
              var docStr = JSON.stringify(doc);
              var enqueue = function() {
                Pool.enqueue(docStr, function (err, res) {
                  console.log("got response: ",res);
                  if (res.stdout=="next") {
                    console.log("POOL: next");
                    if (!finishedSaving())
                      analyzeNext();
                  } else {
                    console.log("POOL: ERROR!");
                  }
                });
              }
              console.log("POOL: enqueing");
              enqueue();

            }
          });
        }
        for (var i = 0; i <=numberWorkers; i++) {
          analyzeNext();
        };


      });

  });
}, 3000);
