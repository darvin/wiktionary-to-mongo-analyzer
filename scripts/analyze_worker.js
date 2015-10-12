console.log("WORKER started");


var MongoClient = require('mongodb').MongoClient;
var wiktAnalyzer = require('enwiktionary-analyzer');
var url = 'mongodb://localhost:27017/wiktionaryToMongo';



MongoClient.connect(url, function(err, db) {
  // console.log("WORKER connected to db");

  var colOutput = db.collection('enWiktionary');
  colOutput.ensureIndex({wordLanguage:1, wordName:1}, {unique:true}, function(err,res) {
    var analyzeAndWrite = function(doc, callback) {
      wiktAnalyzer.analyzer.parseArticle(doc.title, doc.text, function(err, parsedArticle) {
        
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
    process.on('message', function (message) {
      var doc = JSON.parse(message);
      var finished = function(){
        // console.log("WORKER: analyzed '"+doc.title+ "'")
        process.send("next");

      }
      analyzeAndWrite(doc, function(err, res){
        finished();
      });
      // setTimeout(finished, 1000);

    });

  });
});


process.on('SIGINT', function (){
  console.log('WORKER exit');
});
