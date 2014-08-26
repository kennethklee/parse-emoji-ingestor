var Parse = require('parse').Parse,
    async = require('async'),
    ghdownload = require('github-download'),
    jsdom = require('jsdom'),
    fs = require('fs'),
    rmrf = require('rmrf');


Parse.initialize(process.env.APP_ID, null, process.env.MASTER_KEY);
Parse.Cloud.useMasterKey();

var Emoji = Parse.Object.extend('Emoji');

var getPhantomEmojiFiles = function(done) {
  if (fs.existsSync('./phantom')) {
    cleanUp();
  }
  console.log('downloading phantom emoji images...');
  ghdownload('https://github.com/Genshin/PhantomOpenEmoji', './phantom').on('end', function() {
    if (done) {
      console.log('downloaded!');
      done();
    }
  });
};

var getEmojiDictionary = function(done) {
  console.log('retrieving emoji unicode dictionary...');
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
      }
    });

    if (done) {
      console.log('retrieved!');
      done(null, results)
    }
  });
};

var cleanUp = function() {
  console.log('cleaning up...');
  rmrf('./phantom');
  console.log('cleaned!');
}

async.parallel([
  getEmojiDictionary,
  getPhantomEmojiFiles
], function(err, results) {
  var emojiList = results[0];
  var saveToParse = function(emoji, next) {
    var svgPath = './phantom/emoji/' + emoji.shortName + '.svg';
    if (fs.existsSync(svgPath)) {
      var svg = new Buffer(fs.readFileSync(svgPath)),
        file = new Parse.File(emoji.shortName + '.svg', {base64: svg.toString('base64')}, 'image/svg+xml');
      
      file.save().then(function() {
        var record = new Emoji();
        emoji.phantom = file;
        record.save(emoji).then(function() {
          next();
        });
      });
    } else {
      console.log('skipped ' + emoji.shortName);
      next()
    }
  };
  
  // Insert into parse
  console.log('saving to parse...');
  async.each(emojiList, saveToParse, function(err) {
    console.log('saved!');
    cleanUp();
  });
});
