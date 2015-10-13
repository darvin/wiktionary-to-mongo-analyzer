console.log("WORKER started");


var MongoClient = require('mongodb').MongoClient;
var wiktAnalyzer = require('enwiktionary-analyzer');
var url = 'mongodb://localhost:27017/wiktionaryToMongo';
var STANDALONE = false;
if (process.argv[process.argv.length-1]=="standalone") {
  STANDALONE = true;
}
console.time("WORKER_MONGO_CONNECT");
MongoClient.connect(url, function(err, db) {
  // console.log("WORKER connected to db");
  var col = db.collection('enWiktionaryDump');

  var colOutput = db.collection('enWiktionary');
  colOutput.ensureIndex({wordLanguage:1, wordName:1}, {unique:true}, function(err,res) {
    console.timeEnd("WORKER_MONGO_CONNECT");

    var analyzeAndWrite = function(doc, callback) {
      col.findOne({title:doc.title, namespace:doc.namespace}, function(err, doc) {
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
      });
    };
    // console.log("WORKER ready");
    process.on('message', function (message) {

      var doc = message;
      var finished = function(err){
        if (err) {
          console.log("! Error processing '"+doc.title+"' :", err);
          process.send("x");
        }
        else
          process.send(".");

      }
      analyzeAndWrite(doc, function(err, res){
        finished(err);
      });
      // setTimeout(finished, 1000);

    });
    if (STANDALONE) {
      var cursor = col.find({}, {title:1, namespace:1});
      var next = function() {
        cursor.nextObject(function(err, doc) {
          if (err) {
            console.log("WORKER: error: ",err);
          }

          analyzeAndWrite(doc, function(err, res){
            console.log("WORKER: written ", doc.title);
            next();
          });
        });
      }
      next();
    }

  });
});


process.on('SIGINT', function (){
  console.log('WORKER exit');
  process.exit(0);
});




function scheduleGc() {
  if (!global.gc) {
    console.log('WORKER: garbage collection is not exposed');
    return;
  }

  // schedule next gc within a random interval (e.g. 15-45 minutes)
  // tweak this based on your app's memory usage
  var nextSeconds = Math.random() * 10 + 10;

  setTimeout(function(){
    global.gc();
    // console.log('WORKER: manual gc', process.memoryUsage());
    scheduleGc();
  }, nextSeconds * 1000);
}

// call this in the startup script of your app (once per process)
scheduleGc();
