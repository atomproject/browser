'use strict';

let assert = require('assert');
let path = require('path');

let fs = require('q-io/fs');
let VError = require('verror');
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');
let { getElement } = require('./element');
let addElementContext = require('./add-element-context');

let baseDir = path.dirname(__dirname);

// NOTE: this is like `getElement` method and it should be put in its
// own file but since the function is so small keeping it here for now
function getCategory(cat) {
  assert(utils.isObject(cat), 'category has to be an object');

  let { name, displayName } = cat;
  assert(utils.isString(name), 'category name has to be a string');
  utils.ifPresentCheckType('string', 'display name', utils.displayName);

  cat = {};
  cat.name = name;
  cat.displayName = displayName;

  return cat;
}

function validateConfig(cfg) {
  let types = {
    'baseurl': 'string',
    'elements': 'array',
    'categories': 'array',
    'showDemoTester': 'boolean',
    'absoluteBaseurl': 'string',
    'footerText': 'string',
    'travisBaseUrl': 'string',
    'markdownExtensions': 'array',
  };

  for (let key of Object.keys(types)) {
    utils.ifPresentCheckType(types[key], key, cfg[key]);
  }
}

// TODO: this is a general purpose function. keep it here?
function validateUnique(arr, key, name) {
  let hash = {};

  for (let item of arr) {
    if (!hash[item[key]]) {
      hash[item[key]] = true;
    } else {
      assert(false, `${name} have to be unique. duplicate: ${item[key]}`);
    }
  }
}

function validateElementCategories(elements, categories) {
  let catNames = categories.map(cat => cat.name);

  for (let el of elements) {
    if (el.category && catNames.indexOf(el.category) === -1) {
      assert(false, `no category ${el.category} found for element ${el.name}`);
    }
  }
}

function linkElementsWithCategories(elements, categories) {
  return categories.map(cat => {
    let catElements = elements.filter(el => el.category === cat.name);
    catElements.forEach((el, index) => el.indexInCategory = index);
    cat.elements = catElements;

    return cat;
  });
}

let getBaseConfig = Q.async(function* () {
  let filePath = 'metadata.json', config;

  try {
    config = yield fs.read(filePath);
    config = JSON.parse(config);

    return config;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new VError(err, 'Not a valid json file. Parsing metadata.json failed');
    }
    else if (err.code === 'ENOENT') {
      throw new VError(err, 'No metadata.json file present in the current directory');
    }
    else {
      throw err;
    }
  }
});

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

  if (config !== undefined) {
    assert(utils.isObject(config), 'config has to be an object');
  }

  // the `assign` method takes of `undefined` arguments
  // TODO: should we check for bad argument `argvConfig` here?
  config = Object.assign({}, defaultConfig, config, argvConfig);

  validateConfig(config);

  if (config.showDemoTester) {
    config.elements.push({
      'name': 'demo-tester',
      'displayName': 'Demo Tester',
      'install': path.resolve(baseDir, 'demo-tester')
    });
  }

  return config;
}

let getConfig = Q.async(function* (argvConfig) {
  let config, elements, categories;

  try {
    config = yield getBaseConfig();
    config = getDefaultConfig(config, argvConfig);

    elements = config.elements.map(el => getElement(el));
    elements = yield Promise.all(elements);
    categories = config.categories.map(cat => getCategory(cat));

    validateUnique(elements, 'name', 'element names');
    // TODO: change the assertion message or do something else?
    validateUnique(elements, 'pageDirName', 'element display names');
    validateUnique(categories, 'name', 'category names');
    validateElementCategories(elements, categories);

    categories = linkElementsWithCategories(elements, categories);

    config.elements = elements;
    config.categories = categories;
  } catch (err) {
    if (err instanceof assert.AssertionError ||
        err instanceof VError) {

      throw err;
    }

    throw new VError(err, 'Not a valid metadata.json file');
  }

  return config;
});

let getFullConfig = Q.async(function* (config) {
  let elements = config.elements;

  elements = elements.map(el =>
    addElementContext(config.baseurl, config.travisBaseUrl, el)
  );

  elements = yield Promise.all(elements);
  config.elements = elements;

  return config;
});

let addElement = Q.async(function* (el) {
  let config = yield getBaseConfig();
  config.elements = config.elements || [];
  config.elements.push(el);

  return fs.write('metadata.json', JSON.stringify(config, null, 4));
});

module.exports = {
  getCategory: getCategory,

  validateConfig: validateConfig,
  validateUnique: validateUnique,
  validateElementCategories: validateElementCategories,

  linkElementsWithCategories: linkElementsWithCategories,

  getBaseConfig: getBaseConfig,
  getDefaultConfig: getDefaultConfig,
  getConfig: getConfig,
  getFullConfig: getFullConfig,
  addElement: addElement
};
