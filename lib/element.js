let assert = require('assert');

let Q = require('q');
Q.longStackSupport = true;

let gurl = require('./github-url');
let utils = require('./utils');

/**
 * Validates the polymer element name
 * @param  {String} name the name to validate
 * @return {undefined}
 */
function validateName(name) {
  assert.ok(name, 'name cannot be empty');
  assert(utils.isString(name), 'name should be a string');
  assert(/^\w+-\w/.test(name), 'name should contain at least a single `-`');
}

/**
 * Validate the bower install endpoint
 * @param  {String} install the install endpoint
 * @return {Promise}        resolves when validation completes
 */
function validateInstall(install) {
  assert.ok(install, 'install cannot be empty');
  assert(utils.isString(install), 'install has to be a string');

  return utils.bowCmd('info', install).catch(() =>
    assert(false, `bower couldn\'t find the package: ${install}`)
  );
}

let ifpct = utils.ifPresentCheckType;
let validateCategory = ifpct.bind(null, 'string', 'category');
let validateDisplayName = ifpct.bind(null, 'string', 'display name');
let validateGithubUrl = ifpct.bind(null, 'string', 'github url');
let validateAlpha = ifpct.bind(null, 'boolean', 'alpha');
let validateDemo = ifpct.bind(null, 'boolean', 'disable demo');

/**
 * Validate and add properties on the element config object
 * @param {Object} el the base element config object
 * @return {Object}    the element config object
 */
let getElement = Q.async(function* (el) {
  assert(utils.isObject(el), 'element has to be an object');

  let { name, install, githubUrl } = el;
  let { displayName, category, alpha, disableDemo } = el;

  validateName(name);
  validateCategory(category);
  validateDisplayName(displayName);
  validateGithubUrl(githubUrl);
  validateAlpha(alpha);
  validateDemo(disableDemo);

  yield validateInstall(install);

  el = {};
  el.name = name;
  el.install = install;
  el.category = category;
  el.github = githubUrl;
  el.displayName = displayName = displayName || el.name;
  el.alpha = alpha;
  el.disableDemo = disableDemo;

  el.github = githubUrl && gurl(githubUrl);

  el.pageDirName      = utils.toDashCase(displayName);
  el.pageDir          = `_site/${el.pageDirName}`;
  el.dir              = `_site/${el.pageDirName}/bower_components/${el.name}`;

  el.propertyFile     = `${el.dir}/property.json`;
  el.demoFile         = `${el.dir}/demo/atom.html`;
  el.bowerFile        = `${el.dir}/bower.json`;
  el.designDocFile    = `${el.dir}/design-doc.md`;
  el.elementFile      = `${el.dir}/${el.name}.html`;

  el.userPropertyFile = `${el.name}/property.json`;
  el.userDemoFile     = `${el.name}/demo/atom.html`;

  return el;
});

module.exports = {
  getElement: getElement,
  validateName: validateName,
  validateInstall: validateInstall,
  validateCategory: validateCategory,
  validateDisplayName: validateCategory,
  validateGithubUrl: validateCategory
};
