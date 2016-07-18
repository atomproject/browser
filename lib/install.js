let fs = require('q-io/fs');
let Q = require('q');
Q.longStackSupport = true;

let utils = require('./utils');

let installElement = Q.async(function* (log, el) {
  yield fs.makeTree(el.pageDir);

  log(`Install: ${el.name} in directory ${el.pageDir}`);
  yield utils.bowInstall([el.install], el.pageDir);

  yield fs.copy(`${el.dir}/bower.json`, `${el.pageDir}/bower.json`);

  log(`Install: dev dependencies in directory ${el.pageDir}`);
  yield utils.bowInstall(undefined, el.pageDir);

  log(`Install: dynamic-data-source element in directory ${el.pageDir}`);
  yield utils.bowInstall(['atomproject/dynamic-data-source'], el.pageDir);
});

let installAllElements = Q.async(function* (log, config) {
  for (let el of config.elements) {
    yield installElement(log, el);
  }
});

module.exports = {
  installElement: installElement,
  installAllElements: installAllElements
};
