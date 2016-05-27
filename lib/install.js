'use strict';

let fs = require('q-io/fs');
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let log  = () => {};

let installElement = Q.async(function* (el) {
  let elDir = `_site/${el.pageDirName}`;

  yield fs.makeTree(elDir);

  log(`Install: ${el.name} in directory ${elDir}`);
  yield utils.bowInstall([el.install], elDir);

  let elBowerDir = `${elDir}/bower_components/${el.name}`;
  yield fs.copy(`${elBowerDir}/bower.json`, `${elDir}/bower.json`);

  log(`Install: dev dependencies in directory ${elDir}`);
  yield utils.bowInstall(undefined, elDir);

  log(`Install: dynamic-data-source element in directory ${elDir}`);
  yield utils.bowInstall(['atomproject/dynamic-data-source'], elDir);
});

let installAllElements = Q.async(function* (config) {
  let elements = config.elements.filter(el => el.name !== 'demo-tester');

  for (let el of elements) {
    yield installElement(el);
  }
});

module.exports = {
  installElement: installElement,
  installAllElements: installAllElements
};
