var Parse = require('parse').Parse,
    async = require('async'),
    ghdownload = require('github-download'),
    jsdom = require('jsdom'),
    fs = require('fs'),
    rmrf = require('rmrf');


Parse.initialize(process.env.APP_ID, process.env.JAVASCRIPT_KEY, process.env.MASTER_KEY);

var Emoji = Parse.Object.extend('Emoji');

var getPhantomEmojiFiles = function(done) {
  ghdownload('https://github.com/Genshin/PhantomOpenEmoji', './phantom').on('end', function() {
    if (done) {
      done();
    }
  });
};

var getEmojiDictionary = function(done) {
  jsdom.env('http://apps.timwhitlock.info/emoji/tables/unicode', ['http://code.jquery.com/jquery.js'], function(err, window) {
    var $ = window.$,
        results = [];

    $('tr').each(function() {
      var phantomTitle = $('.theme-phantom a', this).attr('title');
      if (phantomTitle) {
        var emoji = {
          shortName: phantomTitle,
          unicode: $('.code a', this).text(),
          text: $('.name', this).text().toLowerCase()
        };
        results.push(emoji);
        console.log(emoji);
      }
    });

    if (done) {
      done(null, results)
    }
  });
};

async.parallel([
  getEmojiDictionary,
  getPhantomEmojiFiles
], function(err, results) {
  var emojiList = results[0];
  var saveToParse = function(emoji, next) {
    var svgPath = './phantom/emoji/' + emoji.shortName + '.svg';
    if (fs.existsSync(svgPath)) {
      var svg = new Buffer(fs.readFileSync(svgPath)),
          file = new Parse.File(svg);
      
      emoji.phantom = file;
      
      var record = new Emoji();
      record.save(emoji);
    }
  };
  
  // Insert into parse
  async.map(emojiList, saveToParse, function(err) {
      // Clean up
      rmrf('./phantom');
  });
})



/*
// Quick parse test

    query = new Parse.Query(Emoji);

query.find(function(response) {
  console.log(response);
});
*/