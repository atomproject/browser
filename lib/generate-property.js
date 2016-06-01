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

// TODO: try using individual arguments instead of a whole object
// makes it easy to document and understand the function interface
let createProperty = Q.async(function* (el) {
  let name = el.name;
  let filePath = el.filePath;
  let displayName = el.displayName;

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

    // ignore private, read only and function properties
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
    // so don't output these values since they are default values
    // which will be generated on the client (t-demo-atom) later.
    // strictly we don't need to output values for any property but
    // we do it only so that the user knows they can be changed
    if (prop.default !== undefined &&
        propObj.type !== 'object' &&
        propObj.type !== 'array') {

      propObj.value = prop.default;
    }
  });

  return data;
});

// TODO: fix the interface of this function.
// we don't need the whole config object here
// we only need a list of elements with following properties
let generateProperties = Q.async(function* (log, config) {
  let elements = config.elements
    .map(el => {
      return {
        name: el.name,
        displayName: el.displayName,
        filePath: `${el.dir}/${el.name}.html`,
        propertyFile: `${el.dir}/property.json`
      };
    });

  yield Promise.all(elements.map(Q.async(function* (el) {
    let exists = yield fs.exists(el.propertyFile);

    if (!exists) {
      log(`Create: create property.json for ${el.name}`);
      let data = yield createProperty(el);

      data =  JSON.stringify(data, null, 4);
      yield fs.write(el.propertyFile, data);
    }
  })));
});

module.exports = {
  generateProperties: generateProperties,
  createProperty: createProperty
};
