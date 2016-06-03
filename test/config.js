let path = require('path');
let assert = require('chai').assert;
let fs = require('q-io/fs');

let Q = require('q');
Q.longStackSupport = true;

let {
  getCategory,

  validateConfig,
  validateUnique,
  validateElementCategories,

  linkElementsWithCategories,

  getBaseConfig,
  getDefaultConfig,
  getConfig
} = require('../lib/config');

let asyncThrows = Q.async(function* (fn, name, fp1, msgRe) {
  let throwAgain = false, doesMatch = true, msg;

  yield fs.rename(fp1, 'metadata.json');

  try {
    yield fn();
    throwAgain = true;
  } catch (err) {
    if (msgRe) {
      doesMatch = msgRe.test(err.message);
      msg = err.message;
    }
  } finally {
    yield fs.rename('metadata.json', fp1);

    if (throwAgain) {
      throw new Error(`expected ${name} to throw an error`);
    }
    else if (!doesMatch) {
      let errMsg = `error message doesn\'t match the pattern ${msgRe}\nError: ${msg}`;
      throw new Error(errMsg);
    }
  }
});

let asyncDoesNotThrow = Q.async(function* (fn, name, fp1) {
  let throwAgain = false;

  yield fs.rename(fp1, 'metadata.json');

  try {
    yield fn();
  } catch (err) {
    throwAgain = true;
  } finally {
    yield fs.rename('metadata.json', fp1);

    if (throwAgain) {
      throw new Error(`expected ${name} to not throw an error`);
    }
  }
});

describe('getCategory', () => {
  it('should throw if name is invalid', () => {
    assert.throws(getCategory.bind(null, {}));
    assert.throws(getCategory.bind(null, {name: true}));
    assert.throws(getCategory.bind(null, {name: 1}));
  });

  it('should not throw if name is valid', () => {
    assert.doesNotThrow(getCategory.bind(null, {name: 'x'}));
  });

  it('should throw if display name is invalid', () => {
    assert.throws(getCategory.bind(null, {displayName: {}}));
    assert.throws(getCategory.bind(null, {displayName: true}));
    assert.throws(getCategory.bind(null, {displayName: 1}));
  });

  it('should not throw if display name empty or is valid', () => {
    assert.doesNotThrow(getCategory.bind(null, {name: 'x'}));
    assert.doesNotThrow(getCategory.bind(null, {
      name: 'x',
      displayName: 'y'
    }));
  });
});

describe('validateConfig', () => {
  it('should throw if it contains invalid property', () => {
    let input = {elements: 'alsd'};
    assert.throw(validateConfig.bind(null, input), /has to be array/);

    input = {categories: 'alsd'};
    assert.throw(validateConfig.bind(null, input), /has to be array/);

    input = {footerText: []};
    assert.throw(validateConfig.bind(null, input), /has to be string/);
  });

  it('should not throw if it contains only valid properties', () => {
    let input = {elements: []};
    assert.doesNotThrow(validateConfig.bind(null, input));

    input = {categories: []};
    assert.doesNotThrow(validateConfig.bind(null, input));

    input = {footerText: 'xy'};
    assert.doesNotThrow(validateConfig.bind(null, input));
  });
});

describe('validateUnique', () => {
  it('should throw error if an array contains duplicates', () => {
    let arr = [{
      name: 'jon',
      age: 22
    }, {
      name: 'jon',
      age: 32
    }, {
      name: 'ygritte',
      age: 22
    }];
    let re = /have to be unique\. duplicate/;

    assert.throws(validateUnique.bind(null, arr, 'name', 'the name'), re);
    assert.throws(validateUnique.bind(null, arr, 'age', 'the age'), re);
  });

  it('should throw not error if there are no duplicates', () => {
    let arr = [{
      name: 'jon',
      age: 22
    }, {
      name: 'eddard',
      age: 32
    }, {
      name: 'ygritte',
      age: 42
    }];
    let re = /have to be unique\. duplicate/;

    assert.doesNotThrow(validateUnique.bind(null, arr, 'name', 'name'), re);
    assert.doesNotThrow(validateUnique.bind(null, arr, 'age', 'age'), re);
  });
});

describe('validateElementCategories', () => {
  let vec = validateElementCategories;
  let elements = [{
    name: 'x-y',
    category: 'p'
  }, {
    name: 'x-m',
    category: 'q'
  }];

  it('should if element contains a unknown category', () => {
    let categories = [{
      name: 'p',
    }];
    let re = /no category .* found/;

    assert.throws(vec.bind(null, elements, []), re);
    assert.throws(vec.bind(null, elements, categories), re);
  });

  it('should if element contains a unknown category', () => {
    let categories = [{
      name: 'p'
    }, {
      name: 'q'
    }];

    assert.doesNotThrow(vec.bind(null, elements, categories));
  });
});

describe('linkElementsWithCategories', () => {
  it('should add elements property on a category', () => {
    let elements = [
      {category: 'x', name: 'a'}, {category: 'x', name: 'b'},
      {category: 'y', name: 'c'}, {category: 'y', name: 'd'}
    ];
    let categories = [{name: 'x'}, {name: 'y'}];
    categories = linkElementsWithCategories(elements, categories);

    assert.equal(categories[0].name, 'x');
    categories[0].elements.forEach((el, i) => {
      assert.equal(el.name, elements[i].name);
      assert.equal(el.category, 'x');
      assert.equal(el.indexInCategory, i);
    });

    assert.equal(categories[1].name, 'y');
    categories[1].elements.forEach((el, i) => {
      assert.equal(el.name, elements[i + 2].name);
      assert.equal(el.category, 'y');
      assert.equal(el.indexInCategory, i);
    });
  });
});

describe('getBaseConfig', () => {
  let baseDir = path.dirname(__dirname);
  let configDir = path.resolve(__dirname, 'fixture/config');

  before(() => process.chdir(configDir));
  after(() => process.chdir(baseDir));

  it('should throw if metadata.json is not present', () => {
    return getBaseConfig()
      .then(
        () => Promise.reject('`getBaseConfig` cannot succeed'),
        err => {
          let re = /No metadata\.json file present/;

          if (re.test(err.message)) {
            return Promise.resolve();
          }

          let errMsg = `error doesn't match ${re}. Error: ${err.message}`;
          return Promise.reject(errMsg);
        }
      );
  });

  it('should throw if metadata.json is not a valid json file', () => {
    let fn = getBaseConfig.bind(null);
    let re = /Parsing metadata\.json failed/;

    return asyncThrows(fn, 'getBaseConfig', 'bad-json.json', re);
  });

  it('should return the config if a valid metadata.json is present', () => {
    let fn = getBaseConfig.bind(null);

    return asyncDoesNotThrow(fn, 'getBaseConfig', 'correct-metadata.json');
  });
});

describe('getDefaultConfig', () => {
  it('should check if config is okay', () => {
    assert.doesNotThrow(getDefaultConfig.bind(null));
    assert.throw(getDefaultConfig.bind(null, 'x'), /has to be an object/);
    assert.throw(getDefaultConfig.bind(null, 1), /has to be an object/);
  });

  // test for the correct types of values
  it('should throw if metadata.json format is invalid', () => {
    let metadataJson = {
      baseurl: true,
      elements: 'elements'
    };

    assert.throws(getDefaultConfig.bind(null, metadataJson));
  });

  it('should override defaults with metadata.json', () => {
    let metadataJson = {
      baseurl: '/random',
      markdownExtensions: ['.markdown', '.md'],
      showDemoTester: false
    };

    let config = getDefaultConfig(metadataJson);

    assert.equal(config.baseurl, metadataJson.baseurl);
    assert.equal(config.markdownExtensions, metadataJson.markdownExtensions);
    assert.equal(config.showDemoTester, metadataJson.showDemoTester);
  });

  it('should override all other values with argv values', () => {
    let metadataJson = {
      baseurl: '/random',
      markdownExtensions: ['.markdown', '.md'],
      showDemoTester: false
    };
    let argvConfig = {
      baseurl: '/xyz-random'
    };

    let config = getDefaultConfig(metadataJson, argvConfig);

    assert.equal(config.baseurl, argvConfig.baseurl);
    assert.equal(config.markdownExtensions, metadataJson.markdownExtensions);
    assert.equal(config.showDemoTester, metadataJson.showDemoTester);
  });

  it('should add demo-tester element', () => {
    let config = getDefaultConfig({});
    let dt = config.elements[0];

    assert.equal(dt.name, 'demo-tester');
    assert.equal(dt.displayName, 'Demo Tester');
  });
});

describe('getConfig', () => {
  let baseDir = path.dirname(__dirname);
  let configDir = path.resolve(__dirname, 'fixture/config');

  before(() => process.chdir(configDir));
  after(() => process.chdir(baseDir));

  it('should throw if metadata.json is bad json', () => {
    let fn = getConfig.bind(null);
    let re = /Parsing metadata\.json failed/;

    return asyncThrows(fn, 'getConfig', 'bad-json.json', re);
  });

  it('should throw if basic structure of metadata.json is bad', () => {
    let fn = getConfig.bind(null);
    let re = /has to be a/;

    return asyncThrows(fn, 'getConfig', 'bad-properties.json', re);
  });

  it('should throw if metadata.json contains bad element', () => {
    let fn = getConfig.bind(null);
    let re = /at least a single/;

    return asyncThrows(fn, 'getConfig', 'bad-element.json', re);
  });

  it('should throw if metadata.json contains bad category', () => {
    let fn = getConfig.bind(null);
    let re = /has to be a/;

    return asyncThrows(fn, 'getConfig', 'bad-category.json', re);
  });

  it('should throw if metadata.json contains duplicate elements', () => {
    let fn = getConfig.bind(null);
    let re = /have to be unique/;

    return asyncThrows(fn, 'getConfig', 'dup-element-name.json', re);
  });

  it('should throw if metadata.json contains duplicate categories', () => {
    let fn = getConfig.bind(null);
    let re = /have to be unique/;

    return asyncThrows(fn, 'getConfig', 'dup-category-name.json', re);
  });

  it('should link elements and categories');
  it('should add dir properties on elements');
});
