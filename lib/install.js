'use strict';

let fs = require('q-io/fs');
let Q = require('q');
let bower = require('bower');

let installElement = Q.async(function* (el) {
  let elDir = `_site/${el.pageDirName}`;
  let opts = {cwd: elDir};

  yield fs.makeTree(elDir);

  console.log(`Install: ${el.name} in directory ${elDir}`);
  yield new Promise((resolve, reject) => {
    bower.commands
      .install([el.install], undefined, opts)
      .on('end', resolve)
      .on('error', reject);
  });

  let elBowerDir = `${elDir}/bower_components/${el.name}`;
  yield fs.copy(`${elBowerDir}/bower.json`, `${elDir}/bower.json`);

  console.log(`Install: dev dependencies in directory ${elDir}`);
  yield new Promise((resolve, reject) => {
    bower.commands
      .install(undefined, undefined, opts)
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Install: dynamic-data-source element in directory ${elDir}`);
  yield new Promise((resolve, reject) => {
    bower.commands
      .install(['atomproject/dynamic-data-source'], undefined, opts)
      .on('end', resolve)
      .on('error', reject);
  });
});

let installAllElements = Q.async(function* (config) {
  let elements = config.elements.filter(el => el.name !== 'demo-tester');

  for (let el of elements) {
    yield installElement(el);
  }
});

exports.installElement = installElement;
exports.installAllElements = installAllElements;
