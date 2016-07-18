let path = require('path');
let Q = require('q');
Q.longStackSupport = true;

let { copy, isString } = require('./utils');
let baseDir = path.dirname(__dirname);

/**
 * Creates a new documentation site directory with some sample input files
 * already present. This can be a starting point for creating your own
 * documentation site.
 * @param {[type]} log    The logger object
 * @param {[type]} newDir The name of the new directory
 * @return {[type]}        The name of the new directory
 */
let seedNew = Q.async(function*(log, newDir) {
  newDir = isString(newDir) && newDir ? newDir : 'docs';

  console.log(`Create: New browser project created in ${newDir} directory`);
  let patterns = [
    'favicon.ico',
    'metadata.json',
    'assets/!(particles.json)',
    'pages/!(index.html|settings.md)'
  ];

  yield copy(patterns, baseDir, newDir);

  return newDir;
});

module.exports = seedNew;
