let path = require('path');
let assert = require('chai').assert;

let { extractDeps, getBowerDeps } = require('../lib/utils');

describe('extract dependencies', () => {
  let actualDeps, elInstall = 'some/bower-endpoint';
  let baseDir = path.join(__dirname, 'fixture/extract-deps');
  let bowerPath = path.join(baseDir, 'bower.json');
  let demoFilePath = path.join(baseDir, 'demo/atom.html');
  let expectedDeps = [{
    type: 'script',
    relPath: 'webcomponentsjs/webcomponents-lite.js',
    install: 'webcomponentsjs#^0.7.19'
  }, {
    type: 'script',
    relPath: 'jquery/jquery.js',
    install: 'jquery#~1.9.1'
  }, {
    type: 'script',
    relPath: 'extract-deps/demo/some-js.js',
    install: elInstall
  }, {
    type: 'link',
    relPath: 't-shared-components/theme.html',
    install: 'atomelements/t-shared-components#^1.0.0'
  }, {
    type: 'link',
    relPath: 'paper-button/paper-button.html',
    install: 'polymerelements/paper-button#master'
  }, {
    type: 'link',
    relPath: 'extract-deps/demo/some-html.html',
    install: elInstall
  }, {
    type: 'link',
    relPath: 'extract-deps/extract-deps.html',
    install: elInstall
  }];

  // `relPath` is unique for each dependency this function
  // allways produces a unique ordering for a given set of
  // dependencies thus ensuring that order doesn't affect
  // the `deepEqual` assertion
  let comp = (a, b) => a.relPath - b.relPath;

  expectedDeps = expectedDeps.sort(comp);

  before(() => {
    return extractDeps(bowerPath, demoFilePath, elInstall)
      .then(deps => actualDeps = deps.sort(comp));
  });

  describe('should resolve install endpoint', () => {
    it('from bower.json for external dependencies', () => {
      let isExternal = dep => dep.install !== elInstall;
      let actualExtDeps = actualDeps.filter(isExternal);
      let expectedExtDeps = expectedDeps.filter(isExternal);

      assert.deepEqual(actualExtDeps, expectedExtDeps);
    });

    it('from the given value for internal dependencies', () => {
      let isInternal = dep => dep.install === elInstall;
      let actualIntDeps = actualDeps.filter(isInternal);
      let expectedIntDeps = expectedDeps.filter(isInternal);

      assert.deepEqual(actualIntDeps, expectedIntDeps);
    });
  });

  it('should ignore css dependencies', () => {
    let actualCssDeps = actualDeps
      .filter(dep => /\.css$/.test(dep.relPath));

    assert.deepEqual(actualCssDeps, []);
  });

  // this is only necessary if hydrolysis is used internally
  it('should ignore the demo file itself', () => {
    let demoBaseName = path.basename(demoFilePath);
    let demoDep = actualDeps
      .find(dep => dep.relPath.indexOf(demoBaseName) > -1);

    assert.equal(demoDep, undefined);
  });
});

describe('get bower dependencies', () => {
  let bowerPath = path.join(__dirname, 'fixture/extract-deps/bower.json');
  let expectedBowerDeps = {
    'jquery': 'jquery#~1.9.1',
    'backbone': 'backbone-amd#~1.0.0',
    'bootstrap': 'http://twitter.github.io/bootstrap/assets/bootstrap',
    'paper-button': 'polymerelements/paper-button#master',
    'webcomponentsjs': 'webcomponentsjs#^0.7.19',
    't-shared-components': 'atomelements/t-shared-components#^1.0.0',
    'web-component-tester': 'web-component-tester'
  };
  let actualBowerDeps;

  before(() => {
    return getBowerDeps(bowerPath)
      .then(bowerDeps => actualBowerDeps = bowerDeps);
  });

  it('should merge dev dependencies with dependencies', () => {
    assert.deepEqual(actualBowerDeps, expectedBowerDeps);
  });

  it('should handle endpoints with versions', () => {
    let versionDeps = [
      'jquery',
      'backbone',
      'webcomponentsjs',
      'web-component-tester',
      't-shared-components',
      'paper-button'
    ];

    for (let dep in versionDeps) {
      assert.equal(actualBowerDeps[dep], expectedBowerDeps[dep]);
    }
  });

  it('should handle bower registry endpoints', () => {
    let registry = [
      'jquery',
      'backbone',
      'webcomponentsjs',
      'web-component-tester'
    ];

    for (let dep in registry) {
      assert.equal(actualBowerDeps[dep], expectedBowerDeps[dep]);
    }
  });

  it('should handle * endpoints', () => {
    let starDeps = [
      'web-component-tester'
    ];

    for (let dep in starDeps) {
      assert.equal(actualBowerDeps[dep], expectedBowerDeps[dep]);
    }
  });

  it('should handle github endpoints', () => {
    let ghDeps = [
      'paper-button',
      't-shared-components'
    ];

    for (let dep in ghDeps) {
      assert.equal(actualBowerDeps[dep], expectedBowerDeps[dep]);
    }
  });

  it('should handle url endpoints', () => {
    let urlDeps = [
      'bootstrap'
    ];

    for (let dep in urlDeps) {
      assert.equal(actualBowerDeps[dep], expectedBowerDeps[dep]);
    }
  });
});
