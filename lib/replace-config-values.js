let path = require('path');

let fs = require('q-io/fs');
let Liquid = require('liquid-node');
let engine = new Liquid.Engine();
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

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
