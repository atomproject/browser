let path = require('path');
let assert = require('chai').assert;
let Q = require('q');
Q.longStackSupport = true;

let { createProperty } = require('../lib/generate-property');

describe('property.json generator', () => {
  it('should generate proper.json file properly', done => {
    Q.spawn(function* () {
      let elConfig = {
        name: 'some-elem',
        displayName: 'Some Element',
        filePath: path.join(__dirname, 'some-elem.html')
      };

      let expectedData = {
        name: elConfig.displayName,
        properties: [{
          name: 'Properties',
          fields: {
            bool: {
              name: 'bool',
              type: 'boolean',
              value: false
            },

            str: {
              name: 'str',
              type: 'string',
              value: 'some string'
            },

            num: {
              name: 'num',
              type: 'number',
              value: 10
            },

            obj: {
              name: 'obj',
              type: 'object'
            },

            arr: {
              name: 'arr',
              type: 'object'
            },

            dt: {
              name: 'dt',
              type: 'object'
            }
          }
        }]
      };

      let actualData = yield createProperty(elConfig);

      assert.deepEqual(actualData, expectedData);
      done();
    });
  });
});
