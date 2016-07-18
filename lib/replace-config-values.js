let path = require('path');

let fs = require('q-io/fs');
let Liquid = require('liquid-node');
let engine = new Liquid.Engine();
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

/**
 * Replace the value plaholder text with values from config in files.
 * The files are resolved from a set of glob patterns.
 * @param {Function} log      logger function
 * @param {Object}   config   the config object
 * @param {Array}    patterns array of glob patterns for files to process
 * @return {Array}             resolved processed paths
 */
let replaceConfigValues = Q.async(function* (log, config, patterns) {
  let fromDir = path.dirname(__dirname);
  let toDir = '_site';

  let tPaths = yield utils.copy(patterns, fromDir, toDir);

  return tPaths.map(Q.async(function* (p) {
    log(`Replace: ${p}`);
    let content = yield fs.read(p);
    let context = { site: config };

    content = yield engine.parseAndRender(content, context);
    yield fs.write(p, content);
  }));
});

module.exports = replaceConfigValues;
