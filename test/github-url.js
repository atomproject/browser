let assert = require('chai').assert;
let Q = require('q');
Q.longStackSupport = true;

let gurl = require('../lib/github-url');

describe('github url parser', () => {
  it('should handle correct github urls', () => {
    let ghUrl = 'https://github.com/someUser/someRepo';
    let expectedOutput = { user: 'someUser', repo: 'someRepo' };

    assert.deepEqual(gurl(ghUrl), expectedOutput);


    ghUrl = 'https://github.com/someUser/someRepo/some.txt';
    assert.deepEqual(gurl(ghUrl), expectedOutput);
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
  });
});
