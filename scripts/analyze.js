#!/usr/bin/env node


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var wiktAnalyzer = require('enwiktionary-analyzer');
var LOG_EVERY = 300;
MongoClient.connect(url, function(err, db) {

  var col = db.collection('enWiktionaryDump');
  var colOutput = db.collection('enWiktionary');
  colOutput.ensureIndex({wordLanguage:1, wordName:1}, {unique:true}, function(err,res) {

    var cursor = col.find({});
    var index = 0;
    var indexSaved = 0;
    cursor.count(function(err, total){

      var analyzeAndWrite = function(doc, callback) {
        wiktAnalyzer.analyzer.parseArticle(doc.title, doc.text, function(err, parsedArticle) {
          indexSaved++;
          if (indexSaved % LOG_EVERY==0) {
            console.log ("Analyzed: "+indexSaved+"/"+total + "(current: '"+doc.title+"' " +Object.keys(parsedArticle)+")");
          }
          if (err || !parsedArticle || Object.keys(parsedArticle).length == 0) {
            console.error("Error parsing article: '"+doc.title+"' ", err)
            callback(err);
          } else {
            var outputIndex = 0;
            Object.keys(parsedArticle).forEach(function(lang) {
              var word = parsedArticle[lang];
              word.wordLanguage = word.word[0];
              word.wordName = word.word[1];
              colOutput.insert(word, function(err, r){
                outputIndex ++;
                if (outputIndex==Object.keys(parsedArticle).length) {
                  callback(null);
                }

              });

            });
          }
        });
      };

      var analyzeNext = function() {
        
        cursor.nextObject(function(err, doc) {
          if (err)
            console.error(err);
          if (!doc) {
            db.close();
          }
          index ++;
          if (index % LOG_EVERY==0) {
            console.log ("Read: "+index+"/"+total + " (current: '"+doc.title+"' )");
          }
          analyzeAndWrite(doc, function(err) {
            analyzeNext();
          })
        });
      }
      analyzeNext();

    });
  });

});
