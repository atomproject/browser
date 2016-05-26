let fs = require('q-io/fs');
let path = require('path');
let bower = require('bower');
let Q = require('q');
Q.longStackSupport = true;

let { generateProperties } = require('./generate-property');
let installAllElements = require('./install').installAllElements;
let getElementIds = require('./get-element-ids');
let vulcanCrisp = require('./vulcan-crisp');
let build = require('./build');
let cfg = require('./config');
let {copy, removeBowerComponents, mergePatterns} = require('./utils');
let baseDir = path.dirname(__dirname);

let generateSite = Q.async(function*(log, argvConfig) {
  let config = yield cfg.getConfig(argvConfig);
  let exists = yield fs.exists('_site');

  if (!exists) {
    log('Create: create directory _site');
    yield fs.makeTree('_site');

    log('Copy: copy bower.json, components etc.');
    let patterns = ['bower.json', 'components/**', 'scripts/*', 'styles/*'];
    yield copy(patterns, baseDir, '_site');

    log('Install: Install the bower dependencies');
    yield new Promise((resolve, reject) => {
      bower.commands
        .install(undefined, undefined, {cwd: '_site'})
        .on('end', resolve)
        .on('error', reject);
    });

    log('Vulcanize: Install the bower dependencies');
    yield vulcanCrisp();

    log('Remove: Remove bower dependencies');
    yield removeBowerComponents(log);
  }

  log('Copy: Copy favicon.ico, assets etc.');
  let patterns = ['favicon.ico', 'assets/*'];
  yield copy(patterns, baseDir, '_site');
  yield copy(patterns, path.resolve('.'), '_site');

  yield installAllElements(config);

  log('Ids: Get travis ids of elements if present');
  yield getElementIds(config);

  log('Property: Generate the property.json if absent');
  yield generateProperties(config);

  let fullConfig = yield cfg.getFullConfig(config);
  let pages = yield mergePatterns(`${config._pagesDir}/*`, 'pages/*');

  log('Pages: Create the site pages');
  yield build(log, fullConfig, pages);

  console.log('Create: Site generated successfully in _site directory');
});

module.exports = generateSite;
