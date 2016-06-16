let http = require('http');

let bs = require('browser-sync').create();
let static = require('node-static');
let Q = require('q');
Q.longStackSupport = true;

let generateSite = require('./generate-site');
var file = new static.Server('./_site');

module.exports = function serve(log) {
  function handleChange(event, file) {
    log(`\nChange: ${event}:${file}`);

    if (event !== 'change' && event !== 'unlink') {
      return;
    }

    console.log(`\nChange: File changed: ${file}`);
    console.log('Create: Generating site in _site');
    generateSite(log, {_devEnv: true}).then(bs.reload);
  }

  console.log('Create: Generating site in _site');
  generateSite(log, {_devEnv: true}).then(() => {
    console.log('Watching current directory for changes');
    console.log('Browse site on address: http://localhost:8080/');

    bs.watch('./?(assets|pages|*-*)/**', handleChange);
    bs.watch('./?(favicon.ico|metadata.json)', handleChange);
    bs.init({port: 3124, logLevel: 'silent'});

    http.createServer(function (req, resp) {
      req.addListener('end', function () {
        file.serve(req, resp);
      }).resume();
    }).listen(8080);
  });
};
