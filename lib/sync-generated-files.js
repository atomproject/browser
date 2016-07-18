let fs = require('q-io/fs');
let Q = require('q');
Q.longStackSupport = true;

/**
 * Sync the generated files `property.json` and `demo/atom.html`
 * @param {Function} log    logger
 * @param {Object}   config the config object
 * @return {Promise}         the promise that resolves when files are synced
 */
let syncGeneratedFiles = Q.async(function* (log, config) {
  let syncFn = Q.async(function* (el) {
    let exists = yield Promise.all([
      fs.exists(el.userPropertyFile),
      fs.exists(el.userDemoFile)
    ]);

    let cp1, cp2;

    if (exists[0]) {
      log(`Copy: copy user property file for ${el.name}`);
      cp1 = fs.copy(el.userPropertyFile, el.propertyFile);
    }

    if (exists[1]) {
      log(`Copy: copy user demo file for ${el.name}`);
      cp2 = fs.copy(el.userDemoFile, el.demoFile);
    }

    return Promise.all([cp1, cp2]);
  });

  yield Promise.all(config.elements.map(syncFn));
});

module.exports = syncGeneratedFiles;
