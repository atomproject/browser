let path = require('path');
let Q = require('q');
Q.longStackSupport = true;

let {copy} = require('./utils');
let baseDir = path.dirname(__dirname);

let seedNew = Q.async(function*(log, newDir) {
  let type = Object.prototype.toString.call(newDir);
  newDir = type === '[object String]' && newDir ? newDir : 'docs';

  console.log(`Create: New browser project created in ${newDir} directory`);
  let patterns = ['favicon.ico', 'metadata.json','assets/*', 'pages/*'];
  yield copy(patterns, baseDir, newDir);

  return newDir;
});

module.exports = seedNew;
