let fs = require('q-io/fs');
let hydrolysis = require('hydrolysis');
let Q = require('q');
Q.longStackSupport = true;

let supportedTypes = ['string', 'boolean', 'number', 'array', 'object'];

function getPropertyType(type) {
  let translate = {
    'array': 'object'
  };

  type = type.toLowerCase();

  // the type in documentation overrides the type provided in the
  // property description object thus any other type than what we
  // support becomes type object, see the type returned by hydrolysis
  // for the property `author` in `polymerelements/seed-element`
  if (supportedTypes.indexOf(type) === -1) {
    return 'object';
  }

  return translate[type] || type;
}

let createProperty = Q.async(function* (el) {
  let name = el.name;
  let filePath = el.filePath;
  let displayName = el.displayName;
  let exists = yield fs.exists(filePath);

  if (!exists) {
    return;
  }

  let parsedElement = yield hydrolysis.Analyzer.analyze(filePath);
  let data = {
    name: '',
    properties: [{
      name: 'Properties',
      fields: {}
    }]
  };

  let fields = data.properties[0].fields;
  data.name = displayName || name;
  el = parsedElement.elementsByTagName[name];

  if (!el) {
    throw new Error(`${name}.html has no element with name ${name}`);
  }

  el.properties.forEach(prop => {
    let type = getPropertyType(prop.type);

    if (prop.private || prop.readOnly ||
        prop.type === 'function') {

      return;
    }

    //property name
    let propObj = fields[prop.name] = {};

    //display name
    propObj.name = prop.name;
    propObj.type = type;

    // hydrolysis doesn't give the default values of objects properly
    if (prop.default !== undefined &&
        propObj.type !== 'object' &&
        propObj.type !== 'array') {

      propObj.value = prop.default;
    }
  });

  return data;
});

let generateProperties = Q.async(function* (config) {
  let elements = config.elements
    .map(el => {
      let dir = `_site/${el.pageDirName}/bower_components/${el.name}`;

      return {
        name: el.name,
        displayName: el.displayName,
        filePath: `${dir}/${el.name}.html`,
        propertyFile: `${dir}/property.json`
      };
    });

  yield Promise.all(elements.map(Q.async(function* (el) {
    let exists = yield fs.exists(el.propertyFile);

    if (!exists) {
      let data = yield createProperty(el);

      if (!data) {
        return;
      }

      data =  JSON.stringify(data, null, 4);
      yield fs.write(el.propertyFile, data);
    }
  })));
});

module.exports = {
  generateProperties: generateProperties,
  createProperty: createProperty
};
