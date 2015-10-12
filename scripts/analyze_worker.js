console.log("WORKER started");
console.log("importScripts ", importScripts('../node_modules/mongodb/index.js'));

console.log("1");
console.log("require ", require);

var MongoClient = require('mongodb').MongoClient;
var wiktAnalyzer = require('enwiktionary-analyzer');
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
console.log("2");

MongoClient.connect(url, function(err, db) {
  console.log("WORKER connected to db");

  var colOutput = db.collection('enWiktionary');
  colOutput.ensureIndex({wordLanguage:1, wordName:1}, {unique:true}, function(err,res) {
    var analyzeAndWrite = function(doc, callback) {
      wiktAnalyzer.analyzer.parseArticle(doc.title, doc.text, function(err, parsedArticle) {
        indexSaved++;
        if (indexSaved>=LIMIT) {
          console.timeEnd("total");
          console.log("FINISHED ANALYZING");
        }
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
    console.log("WORKER ready");

    this.onmessage = function (event) {
      var doc = JSON.parse(event.data);
      analyzeAndWrite(doc, function(err, res){
        postMessage("next");
      });
    }

  });
});