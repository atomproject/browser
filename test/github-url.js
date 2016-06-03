let assert = require('chai').assert;
let Q = require('q');
Q.longStackSupport = true;

let gurl = require('../lib/github-url');

describe('github url parser', () => {
  it('should handle correct github urls', () => {
    let ghUrl = 'https://github.com/xUser/xRepo';
    let expectedOutput = { user: 'xUser', repo: 'xRepo' };

    assert.deepEqual(gurl(ghUrl), expectedOutput);
    assert.deepEqual(gurl(ghUrl + '/x/y.txt'), expectedOutput);
  });

  it('should handle bad github urls', () => {
    let ghUrl = 'https://github.com';
    assert.throws(gurl.bind(null, ghUrl));

    ghUrl = 'https://github.com/xx';
    assert.throws(gurl.bind(null, ghUrl));

    ghUrl = 'https://github.com//alskdj';
    assert.throws(gurl.bind(null, ghUrl));

    ghUrl = 'https://random.com/xx/alskdj';
    assert.throws(gurl.bind(null, ghUrl));

    ghUrl = undefined;
    assert.throws(gurl.bind(null, ghUrl));
  });
});
