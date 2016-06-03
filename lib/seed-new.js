let path = require('path');
let Q = require('q');
Q.longStackSupport = true;

let { copy, isString } = require('./utils');
let baseDir = path.dirname(__dirname);

let seedNew = Q.async(function*(log, newDir) {
  newDir = isString(newDir) && newDir ? newDir : 'docs';

  console.log(`Create: New browser project created in ${newDir} directory`);
  let patterns = ['favicon.ico', 'metadata.json','assets/*', 'pages/*'];
  yield copy(patterns, baseDir, newDir);

  return newDir;
});

module.exports = seedNew;
