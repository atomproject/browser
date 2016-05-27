let path = require('path');
let assert = require('chai').assert;
let Q = require('q');
Q.longStackSupport = true;

let { createProperty } = require('../lib/generate-property');

describe('property.json generator', () => {
  let actualData;
  let elConfig = {
    name: 'some-elem',
    displayName: 'Some Element',
    filePath: path.join(__dirname, 'some-elem.html')
  };

  before(() => {
    return createProperty(elConfig).then(data => actualData = data);
  });

  it('should have proper basic structure', () => {
    assert.equal(actualData.name, elConfig.displayName);
    assert.equal(actualData.properties[0].name, 'Properties');
  });

  describe('should preserve value and type for', () => {
    it('boolean property', () => {
      let fields = actualData.properties[0].fields;
      let bool = {
        name: 'bool',
        type: 'boolean',
        value: false
      };

      assert.deepEqual(fields.bool, bool);
    });

    it('string property', () => {
      let fields = actualData.properties[0].fields;
      let str = {
        name: 'str',
        type: 'string',
        value: 'some string'
      };

      assert.deepEqual(fields.str, str);
    });

    it('number property', () => {
      let fields = actualData.properties[0].fields;
      let num = {
        name: 'num',
        type: 'number',
        value: 10
      };

      assert.deepEqual(fields.num, num);
    });
  });

  it('should remove value for object property', () => {
    let fields = actualData.properties[0].fields;
    let obj = {
      name: 'obj',
      type: 'object'
    };

    assert.deepEqual(fields.obj, obj);
  });

  describe('should remove value and change type to object for', () => {
    it('array property', () => {
      let fields = actualData.properties[0].fields;
      let arr = {
        name: 'arr',
        type: 'object'
      };

      assert.deepEqual(fields.arr, arr);
    });

    it('any other property', () => {
      let fields = actualData.properties[0].fields;
      let dt = {
        name: 'dt',
        type: 'object'
      };

      assert.deepEqual(fields.dt, dt);
    });
  });
});
