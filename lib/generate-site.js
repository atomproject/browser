let path = require('path');

let fs = require('q-io/fs');
let Q = require('q');
Q.longStackSupport = true;

let { generateProperties } = require('./generate-property');
let syncGeneratedFiles = require('./sync-generated-files');
let createDemos = require('./generate-demo');
let { installAllElements } = require('./install');
let getElementIds = require('./get-element-ids');
let replaceConfigValues = require('./replace-config-values');
let vulcanCrisp = require('./vulcan-crisp');
let build = require('./build');
let cfg = require('./config');
let utils = require('./utils');
let baseDir = path.dirname(__dirname);

/**
 * custom-style.html should load after theme.html but vulcanize adds
 * the import statement before any other file i.e. in the `head` tag.
 * so we manually move the import to the end of the file
 * @return {undefined}
 */
function fixCustomStyle() {
  return fs.read('_site/components/elements.html')
    .then(content => {
      let customStyleRe = /<link\s*rel="import"\s*href="custom-style[^>]+>/;
      let toReplace = '<link rel="import" href="custom-style.html"></body>';

      content = content.replace(customStyleRe, '');
      content = content.replace(/<\/body>/, toReplace);

      return fs.write('_site/components/elements.html', content);
    });
}

let initialSetup = Q.async(function* (log) {
  log('Create: create directory _site');
  yield fs.makeTree('_site');

  log('Copy: copy bower.json, components etc.');
  let patterns = ['bower.json', 'components/**', 'scripts/*', 'styles/*'];
  yield utils.copy(patterns, baseDir, '_site');

  log('Install: Install the bower dependencies');
  yield utils.bowInstall(undefined, '_site');

  log('Vulcanize: Install the bower dependencies');
  yield vulcanCrisp();

  log('Fix: Move custom-style import in elements.html');
  yield fixCustomStyle();

  log('Remove: Remove bower dependencies');
  yield utils.removeBowerComponents(log);
});

let generateSite = Q.async(function*(log, argvConfig) {
  let config = yield cfg.getConfig(argvConfig);
  let exists = yield fs.exists('_site');
  let patterns;

  if (!exists) {
    yield initialSetup(log);
  }

  log('Copy: Copy favicon.ico, assets etc.');
  patterns = ['favicon.ico', 'assets/*'];
  yield utils.copy(patterns, baseDir, '_site');
  yield utils.copy(patterns, path.resolve('.'), '_site');

  patterns = ['assets/particles.json', 'components/custom-style.html'];
  yield replaceConfigValues(log, config, patterns);

  yield installAllElements(log, config);

  yield getElementIds(log, config);

  log('Property: Generate the property.json if absent');
  yield generateProperties(log, config);

  log('Demo: Generate demo file if absent');
  yield createDemos(log, config);

  yield syncGeneratedFiles(log, config);

  let pages = yield utils.mergePatterns(`${config._pagesDir}/*`, 'pages/*');
  pages = pages.map(p => {
    return { filePath: p, name: path.parse(p).name };
  });

  let fullConfig = yield cfg.getFullConfig(config, pages);

  log('Pages: Create the site pages');
  yield build(log, fullConfig, pages);

  console.log('Create: Site generated successfully in _site directory');
});

module.exports = generateSite;
