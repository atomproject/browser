let assert = require('chai').assert;
let Q = require('q');
Q.longStackSupport = true;

let {
  validateName,
  validateInstall,
  validateCategory,
  validateDisplayName,
  validateGithubUrl,
  getElement
} = require('../lib/element');

let asyncThrows = Q.async(function* (fn, ...args) {
  let throwAgain = false;

  try {
    yield fn.call(...args);
    throwAgain = true;
  } catch (err) {
  } finally {
    if (throwAgain) {
      throw new Error(`Expected ${fn.name} to throw an error`);
    }
  }
});

let asyncDoesNotThrow = Q.async(function* (fn, ...args) {
  let throwAgain = false;

  try {
    yield fn.call(...args);
  } catch (err) {
    throwAgain = true;
  } finally {
    if (throwAgain) {
      throw new Error(`Expected ${fn.name} to not throw an error`);
    }
  }
});

describe('element', () => {
  describe('validateName', () => {
    it('should throw if empty', () => {
      assert.throws(validateName.bind(null));
    });

    it('should throw if not string', () => {
      assert.throws(validateName.bind(null, 1));
    });

    it('should throw if does not contain hyphen', () => {
      assert.throws(validateName.bind(null, 'element'));
    });

    it('should succeed if matches the format', () => {
      assert.doesNotThrow(validateName.bind(null, 'some-element'));
      assert.doesNotThrow(validateName.bind(null, 'some-element-x'));
    });
  });

  describe('validateInstall', function() {
    // TODO: you should stub out `bower` module in `element.js`
    // so that no actual network calls are made by `bower` and tests
    // don't take so much time
    this.timeout(10000);

    it('should throw if empty', () => {
      return asyncThrows(validateInstall, null);
    });

    it('should throw if not string', () => {
      return asyncThrows(validateInstall, null, 1234);
    });

    it('should throw if not a valid bower endpoint', () => {
      return asyncThrows(validateInstall, null, '123xy');
    });

    it('should not throw for a valid bower endpoint', () => {
      return Promise.all([
        asyncDoesNotThrow(validateInstall, null, 'jquery'),
        asyncDoesNotThrow(validateInstall, null, 'webcomponentsjs')
      ]);
    });
  });

  [{
    validateFn: validateCategory,
    name: 'validateCategory'
  }, {
    validateFn: validateDisplayName,
    name: 'validateDisplayName'
  }, {
    validateFn: validateGithubUrl,
    name: 'validateGithubUrl'
  }].forEach(({validateFn, name}) => {
    describe(name, () => {
      it('should throw if not string', () => {
        assert.throws(validateFn.bind(null, 1));
      });

      it('should succeed if empty', () => {
        assert.doesNotThrow(validateFn.bind(null));
      });

      it('should succeed if valid', () => {
        assert.doesNotThrow(validateFn.bind(null, 'xx'));
      });
    });
  });

  describe('getElement', () => {
    let elements = [{
      name: 'paper-button',
      install: 'polymerelements/paper-button',
      githubUrl: 'https://github.com/polymerelements/paper-button'
    }, {
      name: 'demo-tester',
      displayName: 'This is Demo Tester',
      install: 'D:\\atom-project\\browser\\demo-tester'
    }];
    let actElements;

    before(() => {
      return Promise.all(elements.map(el => getElement(el)))
        .then(result => actElements = result);
    });

    it('should throw if input is not an object', () => {
      return asyncThrows(getElement, null);
    });

    it('should by default set display name to name', () => {
      assert.equal(actElements[0].displayName, elements[0].name);
      assert.equal(actElements[1].displayName, elements[1].displayName);
    });

    it('should parse github url into user and repo if present', () => {
      assert.equal(actElements[0].github.user, 'polymerelements');
      assert.equal(actElements[0].github.repo, 'paper-button');
    });

    it('should set directory properties of an element', () => {
      let pageDir = pdn => `_site/${pdn}`;
      let dir = (pdn, name) => `_site/${pdn}/bower_components/${name}`;

      let pdn = 'paper-button';
      let pdr = pageDir(pdn);
      let dr = dir(pdn, 'paper-button');
      assert.equal(actElements[0].pageDirName, pdn);
      assert.equal(actElements[0].pageDir, pdr);
      assert.equal(actElements[0].dir, dr);
      assert.equal(actElements[0].propertyFile, `${dr}/property.json`);
      assert.equal(actElements[0].demoFile, `${dr}/demo/index.html`);
      assert.equal(actElements[0].bowerFile, `${dr}/bower.json`);
      assert.equal(actElements[0].designDocFile, `${dr}/design-doc.md`);
      assert.equal(actElements[0].elementFile, `${dr}/paper-button.html`);

      pdn = 'this-is-demo-tester';
      pdr = pageDir(pdn);
      dr = dir(pdn, 'demo-tester');
      assert.equal(actElements[1].pageDirName, pdn);
      assert.equal(actElements[1].pageDir, pdr);
      assert.equal(actElements[1].dir, dr);
      assert.equal(actElements[1].propertyFile, `${dr}/property.json`);
      assert.equal(actElements[1].demoFile, `${dr}/demo/index.html`);
      assert.equal(actElements[1].bowerFile, `${dr}/bower.json`);
      assert.equal(actElements[1].designDocFile, `${dr}/design-doc.md`);
      assert.equal(actElements[1].elementFile, `${dr}/demo-tester.html`);
    });
  });
});
