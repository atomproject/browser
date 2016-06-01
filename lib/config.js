'use strict';

let fs = require('q-io/fs');
let path = require('path');
let gurl = require('./github-url');
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let baseDir = path.dirname(__dirname);

function getDefaultConfig(config, argvConfig) {
  let defaultConfig = {
    _includesDir: path.resolve(baseDir, 'includes'),
    _layoutsDir: path.resolve(baseDir, 'layouts'),
    _pagesDir: path.resolve(baseDir, 'pages'),
    _templatesDir: path.resolve(baseDir, 'templates'),
    baseurl: '',
    elements: [],
    categories: [],
    showDemoTester: true,
    // TODO: decide default values for next 2 entries
    absoluteBaseurl: undefined,
    footerText: undefined,
    travisBaseUrl: 'https://travis-ci.org',
    markdownExtensions: ['.md']
  };

  // TODO: handle json parsing errors here
  config = JSON.parse(config);

  // TODO: validate the structure of `config` here

  // TODO: check for bad argument `argvConfig` here
  config = Object.assign({}, defaultConfig, config, argvConfig);

  if (config.showDemoTester) {
    config.elements.push({
      'name': 'demo-tester',
      'displayName': 'Demo Tester',
      'install': path.resolve(baseDir, 'demo-tester')
    });
  }

  return config;
}

function getElementContext(el, config) {
  let travisBaseUrl = config.travisBaseUrl;
  let elContext = {};
  let gh, elDir, elDirUrl, elTravisUrl, dir;

  // TODO: all 5 following lines can break, validate `el` here
  elContext.name = el.name;
  elContext.category = el.category;
  elContext.displayName = el.displayName;
  elContext.install = el.install;
  elContext.github = gh = gurl(el.githubUrl);

  if (gh && gh.user && gh.repo) {
    elTravisUrl = `${travisBaseUrl}/${gh.user}/${gh.repo}`;
    elContext.linkToTravis = `${elTravisUrl}/`;
    elContext.buildStatusUrl = `${elTravisUrl}.svg?branch=master`;
  }

  elContext.pageDirName = utils.toDashCase(el.displayName);

  dir = `${elContext.pageDirName}/bower_components/${el.name}`;
  elContext.dir = elDir = `_site/${dir}`;
  elContext.dirUrl = elDirUrl = `${config.baseurl}/${dir}`;

  elContext.pageUrl = `${config.baseurl}/${elContext.pageDirName}/`;
  elContext.documentationFileUrl = `${elDirUrl}/`;
  elContext.demoFileUrl = `${elDirUrl}/demo/index.html`;
  elContext.propertiesFileUrl = `${elDirUrl}/property.json`;

  elContext.propertyFile = `${elDir}/property.json`;

  if (el.name === 'demo-tester') {
    let pf = 'bower_components/t-component-panel/demo/property.json';
    elContext.propertyFile = `_site/${pf}`;
    elContext.propertiesFileUrl = `${config.baseurl}/${pf}`;
  }

  // this will be set later in `getConfig`
  elContext.indexInCategory = 0;

  return elContext;
}

let getConfig = Q.async(function* (argvConfig) {
  let filePath = 'metadata.json';
  let config;

  try {
    config = yield fs.read(filePath);
  } catch (err) {
    console.log('No metadata.json file found. Make sure you are in the right directory\n');
    throw err;
  }

  config = getDefaultConfig(config, argvConfig);

  let elements = config.elements.map(el => getElementContext(el, config));

  config.elements = elements;
  config.categories = config.categories.map(cat => {
    let catElements = elements.filter(el => el.category === cat.name);
    catElements.forEach((el, index) => el.indexInCategory = index);
    cat.elements = catElements;

    return cat;
  });

  return config;
});

let getFullConfig = Q.async(function* (config) {
  let elements = config.elements;

  elements = yield Promise.all(elements.map(Q.async(function* (el) {
    let docP = utils.tryRead(`${el.dir}/design-doc.md`);
    // TODO: both `bower.json` and `demo/index.html` may not be present
    let htmlP = utils.extractInnerHtml(el.name, `${el.dir}/demo/index.html`);
    let depsP = utils.extractDeps(el.dir, el.install);

    let [ doc, html, deps ] = yield Promise.all([docP, htmlP, depsP]);

    el.designDoc = '\n' + doc;
    el.innerHTML = html;
    el.dependencies = JSON.stringify(deps);

    return el;
  })));

  config.elements = elements;

  return config;
});

let addElement = Q.async(function* (el) {
  let filePath = 'metadata.json';

  // TODO: should `metadata.json` validation be done here
  // TODO: file may not be present handle it
  let file = yield fs.read(filePath);
  // TODO: parsing may fail handle it
  let config = JSON.parse(file);
  config.elements = config.elements || [];
  config.elements.push(el);

  return fs.write('metadata.json', JSON.stringify(config, null, 4));
});

module.exports = {
  getElementContext: getElementContext,
  getDefaultConfig: getDefaultConfig,
  getConfig: getConfig,
  getFullConfig: getFullConfig,
  addElement: addElement
};
