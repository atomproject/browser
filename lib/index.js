let fs = require('q-io/fs');
let path = require('path');
let bower = require('bower');
let Q = require('q');
Q.longStackSupport = true;

let generateElementProperties = require('./generate-property');
let installAllElements = require('./install').installAllElements;
let getElementIds = require('./get-element-ids');
let vulcanCrisp = require('./vulcan-crisp');
let build = require('./build');
let cfg = require('./config');
let {copy, removeBowerComponents, mergePatterns} = require('./utils');
let baseDir = path.dirname(__dirname);

let generateSite = Q.async(function*(argvConfig) {
  let exists = yield fs.exists('_site');

  if (!exists) {
    console.log('Create: create directory _site');
    yield fs.makeTree('_site');

    console.log('Copy: copy bower.json, components etc.');
    let patterns = ['bower.json', 'components/**', 'scripts/*', 'styles/*'];
    yield copy(patterns, baseDir, '_site');

    console.log('Install: Install the bower dependencies');
    yield new Promise((resolve, reject) => {
      bower.commands
        .install(undefined, undefined, {cwd: '_site'})
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('Vulcanize: Install the bower dependencies');
    yield vulcanCrisp();

    console.log('Remove: Remove bower dependencies');
    yield removeBowerComponents();
  }

  console.log('Copy: Copy favicon.ico, assets etc.');
  let patterns = ['favicon.ico', 'assets/*'];
  yield copy(patterns, baseDir, '_site');
  yield copy(patterns, path.resolve('.'), '_site');

  let config = yield cfg.getConfig(argvConfig);
  yield installAllElements(config);

  console.log('Ids: Get travis ids of elements if present');
  yield getElementIds(config);

  console.log('Property: Generate the property.json if absent');
  yield generateElementProperties(config);

  let fullConfig = yield cfg.getFullConfig(config);
  let pages = yield mergePatterns(`${config._pagesDir}/*`, 'pages/*');

  console.log('Pages: Create the site pages');
  yield build(fullConfig, pages);
});

let seedNew = Q.async(function*(newDir) {
  let type = Object.prototype.toString.call(newDir);
  newDir = type === '[object String]' && newDir ? newDir : 'docs';

  console.log(`Create: New docs project created in ${newDir} directory`);
  let patterns = ['favicon.ico', 'metadata.json','assets/*', 'pages/*'];
  yield copy(patterns, baseDir, newDir);
});

exports.generateSite = generateSite;
exports.seedNew = seedNew;
