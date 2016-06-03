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

  // TODO: what more should be added here
  describe('getElement', () => {
    it('should throw if input is not an object', () => {
      return asyncThrows(getElement, null);
    });
  });
});
