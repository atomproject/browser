let path = require('path');
let assert = require('chai').assert;

let { createProperty } = require('../lib/generate-property');

describe('property.json generator', () => {
  let actualData, fields;
  let name = 'some-elem';
  let displayName = 'Some Element';
  let filePath = path.join(__dirname, 'fixture/some-elem.html');

  before(() => {
    return createProperty(name, filePath, displayName).then(data => {
      actualData = data;
      fields = actualData.properties[0].fields;
    });
  });

  it('should produce proper structure of property.json', () => {
    assert.equal(actualData.name, displayName);
    assert.equal(actualData.properties[0].name, 'Properties');
  });

  it('should ignore private and read only properties', () => {
    assert.equal(fields.ro, undefined);
    assert.equal(fields._private, undefined);
  });

  describe('should preserve name, type and value for', () => {
    it('boolean property', () => {
      let bool = {
        name: 'bool',
        type: 'boolean',
        value: false
      };

      assert.deepEqual(fields.bool, bool);
    });

    it('string property', () => {
      let str = {
        name: 'str',
        type: 'string',
        value: 'some string'
      };

      assert.deepEqual(fields.str, str);
    });

    it('number property', () => {
      let num = {
        name: 'num',
        type: 'number',
        value: 10
      };

      assert.deepEqual(fields.num, num);
    });
  });

  it('should remove value for object property', () => {
    let obj = {
      name: 'obj',
      type: 'object'
    };

    assert.deepEqual(fields.obj, obj);
  });

  describe('should remove value and change type to object for', () => {
    it('array property', () => {
      let arr = {
        name: 'arr',
        type: 'object'
      };

      assert.deepEqual(fields.arr, arr);
    });

    it('any other property', () => {
      let dt = {
        name: 'dt',
        type: 'object'
      };

      assert.deepEqual(fields.dt, dt);
    });
  });

  it('should remove function properties', () => {
    assert.equal(fields.someFunc, undefined);
    assert.equal(fields._privateSomeFunc, undefined);
  });
});
